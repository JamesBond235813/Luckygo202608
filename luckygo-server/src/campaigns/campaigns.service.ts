import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { Pool, PoolConnection } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';
import {
  AUTO_DRAW_BATCH_SIZE,
  AUTO_DRAW_CONCURRENCY,
  AUTO_DRAW_MYSQL_LOCK_PREFIX,
  DEFAULT_AUTO_DRAW_COUNTDOWN_SECONDS,
  type CampaignStatus,
  LOTTERY_NUMBER_MAX,
  LOTTERY_NUMBER_MIN,
} from './campaigns.constants';
import {
  allocateNextRoundNo,
  formatCampaignRoundNo,
  isValidCampaignRoundNo,
} from './campaign-round-no.util';
import { mapDrawCountdownFields } from './campaign-draw-countdown.util';
import { auditAutoDraw, type AutoDrawSource } from './auto-draw/auto-draw-audit';
import { NotificationsService } from '../notifications/notifications.service';

export interface CampaignRow extends RowDataPacket {
  id: number;
  product_id: number;
  round_no: number;
  total_shares: number;
  price_per_share: number;
  shares_sold: number;
  status: CampaignStatus;
  draw_mode: string;
  auto_draw_on_sellout: number;
  designated_winning_number: string | null;
  winning_number: string | null;
  winner_user_id: number | null;
  draw_proof_json: unknown;
  numbers_generated: number;
  sale_start_at: Date | null;
  sale_end_at: Date | null;
  drawn_at: Date | null;
  auto_draw_countdown_seconds: number;
  sellout_at: Date | null;
  product_title?: string;
  product_description?: string;
  product_image?: string;
  product_tag?: string;
  product_category_id?: number | null;
}

export interface AutoDrawBatchResult {
  attempted: number;
  drawn: number;
  failed: number;
}

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @Inject(MYSQL_POOL) private readonly pool: Pool,
    private readonly notifications: NotificationsService,
  ) {}

  /** 与 DB 查询一致的「是否已到开奖时刻」判断 */
  private isAutoDrawDue(
    row: Pick<CampaignRow, 'sellout_at' | 'auto_draw_countdown_seconds'>,
    toleranceMs = 0,
  ): boolean {
    if (!row.sellout_at) return false;
    const seconds = Number(row.auto_draw_countdown_seconds) || DEFAULT_AUTO_DRAW_COUNTDOWN_SECONDS;
    const drawAtMs = new Date(row.sellout_at).getTime() + seconds * 1000;
    return Date.now() + toleranceMs >= drawAtMs;
  }

  /** 是否仍处于「待自动开奖」状态（sold_out + 开关 + 有满员时间） */
  async isPendingAutoDraw(campaignId: number): Promise<boolean> {
    const [rows] = await this.pool.query<CampaignRow[]>(
      `SELECT status, auto_draw_on_sellout, sellout_at FROM campaigns WHERE id = ?`,
      [campaignId],
    );
    if (!rows.length) return false;
    const c = rows[0];
    return c.status === 'sold_out' && Boolean(c.auto_draw_on_sellout) && Boolean(c.sellout_at);
  }

  /** 所有待自动开奖的期次（含尚未到点的），用于 Redis 任务补偿同步 */
  async findPendingAutoDrawCampaigns(): Promise<
    Array<{ id: number; sellout_at: Date; auto_draw_countdown_seconds: number }>
  > {
    const [rows] = await this.pool.query<CampaignRow[]>(
      `SELECT id, sellout_at, auto_draw_countdown_seconds FROM campaigns
       WHERE status = 'sold_out'
         AND auto_draw_on_sellout = 1
         AND sellout_at IS NOT NULL
       ORDER BY sellout_at ASC
       LIMIT ?`,
      [AUTO_DRAW_BATCH_SIZE * 4],
    );
    return rows.map((r) => ({
      id: r.id,
      sellout_at: r.sellout_at as Date,
      auto_draw_countdown_seconds: Number(r.auto_draw_countdown_seconds) || DEFAULT_AUTO_DRAW_COUNTDOWN_SECONDS,
    }));
  }

  private dueAutoDrawSqlFragment(): string {
    return `status = 'sold_out'
      AND auto_draw_on_sellout = 1
      AND sellout_at IS NOT NULL
      AND TIMESTAMPADD(
            SECOND,
            IFNULL(NULLIF(auto_draw_countdown_seconds, 0), ?),
            sellout_at
          ) <= NOW()`;
  }

  /** 扫描已到期的待开奖期次 id（只读，不加锁） */
  async findDueAutoDrawCampaignIds(limit = AUTO_DRAW_BATCH_SIZE): Promise<number[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT id FROM campaigns
       WHERE ${this.dueAutoDrawSqlFragment()}
       ORDER BY sellout_at ASC
       LIMIT ?`,
      [DEFAULT_AUTO_DRAW_COUNTDOWN_SECONDS, limit],
    );
    return rows.map((r) => Number(r.id));
  }

  /**
   * 批量处理到期自动开奖（供定时任务调用）。
   * 多实例：每期 GET_LOCK + 事务内 FOR UPDATE，不同期可并行。
   */
  async processDueAutoDraws(batchSource: AutoDrawSource): Promise<AutoDrawBatchResult> {
    const ids = await this.findDueAutoDrawCampaignIds();
    if (!ids.length) {
      return { attempted: 0, drawn: 0, failed: 0 };
    }

    let drawn = 0;
    let failed = 0;
    const concurrency = Math.max(1, AUTO_DRAW_CONCURRENCY);

    for (let i = 0; i < ids.length; i += concurrency) {
      const chunk = ids.slice(i, i + concurrency);
      const settled = await Promise.allSettled(
        chunk.map((id) => this.runAutoDrawIfDue(id, { source: batchSource })),
      );
      for (let j = 0; j < settled.length; j++) {
        const outcome = settled[j];
        if (outcome.status === 'fulfilled') {
          if (outcome.value) drawn++;
        } else {
          failed++;
          const id = chunk[j];
          const msg = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
          auditAutoDraw(this.logger, 'FAIL', {
            source: batchSource,
            campaignId: id,
            reason: msg,
          });
        }
      }
    }

    auditAutoDraw(this.logger, 'BATCH', {
      source: batchSource,
      attempted: ids.length,
      drawn,
      failed,
    });

    return { attempted: ids.length, drawn, failed };
  }

  private formatNumber(n: number): string {
    return String(n).padStart(6, '0');
  }

  private validateIntegerPrice(price: number): number {
    const value = Number(price);
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
      throw new BadRequestException({ error: 'Price per share must be a positive integer' });
    }
    return value;
  }

  private validateCountdownSeconds(seconds: number | undefined): number {
    const value = seconds == null ? DEFAULT_AUTO_DRAW_COUNTDOWN_SECONDS : Number(seconds);
    if (!Number.isInteger(value) || value < 1 || value > 3600) {
      throw new BadRequestException({ error: 'Auto draw countdown must be between 1 and 3600 seconds' });
    }
    return value;
  }

  private async insertNumberPool(
    connection: PoolConnection,
    campaignId: number,
    totalShares: number,
  ): Promise<number> {
    const numbers = this.generateUniqueNumbers(totalShares);
    const batchSize = 500;
    for (let i = 0; i < numbers.length; i += batchSize) {
      const chunk = numbers.slice(i, i + batchSize);
      const placeholders = chunk.map(() => '(?, ?, ?)').join(',');
      const params: unknown[] = [];
      chunk.forEach((num) => {
        params.push(campaignId, num, 'available');
      });
      await connection.query(
        `INSERT INTO lottery_numbers (campaign_id, number, status) VALUES ${placeholders}`,
        params,
      );
    }
    await connection.query('UPDATE campaigns SET numbers_generated = 1 WHERE id = ?', [campaignId]);
    return numbers.length;
  }

  /** 期内随机唯一 6 位参与码 */
  private generateUniqueNumbers(total: number): string[] {
    const maxPool = LOTTERY_NUMBER_MAX - LOTTERY_NUMBER_MIN + 1;
    if (total > maxPool) {
      throw new BadRequestException({ error: 'Total shares exceeds unique 6-digit pool capacity' });
    }
    const set = new Set<string>();
    while (set.size < total) {
      const n = randomInt(LOTTERY_NUMBER_MIN, LOTTERY_NUMBER_MAX + 1);
      set.add(this.formatNumber(n));
    }
    return [...set];
  }

  private mapPublicCampaign(row: CampaignRow) {
    const title = row.product_title || '';
    const image = row.product_image || '';
    const description = row.product_description ?? '';
    return {
      id: row.id,
      productId: row.product_id,
      roundNo: row.round_no,
      roundNoDisplay: formatCampaignRoundNo(row.round_no),
      title,
      description,
      image,
      tag: row.product_tag ?? null,
      categoryId: row.product_category_id != null ? Number(row.product_category_id) : null,
      totalShares: row.total_shares,
      pricePerShare: Number(row.price_per_share),
      totalPrice: Number((Number(row.price_per_share) * row.total_shares).toFixed(2)),
      sharesSold: row.shares_sold,
      status: row.status,
      autoDrawOnSellout: Boolean(row.auto_draw_on_sellout),
      designatedWinningNumber: row.designated_winning_number,
      winningNumber: row.winning_number,
      saleStartAt: row.sale_start_at,
      saleEndAt: row.sale_end_at,
      drawnAt: row.drawn_at,
      ...mapDrawCountdownFields(row),
    };
  }

  private baseSelect(extraWhere = '') {
    return `
      SELECT c.*, p.title AS product_title, p.description AS product_description,
             p.image AS product_image, p.tag AS product_tag, p.category_id AS product_category_id
      FROM campaigns c
      JOIN products p ON c.product_id = p.id
      ${extraWhere}
    `;
  }

  /** H5 首页 / 分类页：在售 + 已满员待开奖（未揭晓）；可选按商品分类筛选 */
  async findPublicForHome(categoryId?: number): Promise<Record<string, unknown>[]> {
    const params: unknown[] = [];
    let categoryClause = '';
    if (categoryId != null && categoryId > 0) {
      categoryClause = ' AND p.category_id = ?';
      params.push(categoryId);
    }
    const [rows] = await this.pool.query<CampaignRow[]>(
      `${this.baseSelect()}
       WHERE c.status IN ('selling', 'sold_out', 'drawing')${categoryClause}
       ORDER BY
         CASE
           WHEN c.status IN ('sold_out', 'drawing') AND c.auto_draw_on_sellout = 1 THEN 0
           ELSE 1
         END,
         CASE WHEN c.sellout_at IS NOT NULL THEN c.sellout_at ELSE c.created_at END DESC,
         c.created_at DESC`,
      params,
    );
    return rows.map((r) => this.mapPublicCampaign(r));
  }

  async findPublicSelling(): Promise<Record<string, unknown>[]> {
    return this.findPublicForHome();
  }

  async findOnePublic(id: number): Promise<Record<string, unknown>> {
    const [rows] = await this.pool.query<CampaignRow[]>(
      `${this.baseSelect()} WHERE c.id = ?`,
      [id],
    );
    if (!rows.length) throw new NotFoundException({ error: 'Campaign not found' });
    return this.mapPublicCampaign(rows[0]);
  }

  async findAllAdmin(filters?: {
    productId?: number;
    status?: string;
    roundNo?: string;
    createdFrom?: string;
    createdTo?: string;
  }): Promise<CampaignRow[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters?.productId) {
      clauses.push('c.product_id = ?');
      params.push(filters.productId);
    }
    if (filters?.status) {
      clauses.push('c.status = ?');
      params.push(filters.status);
    }
    const roundDigits = filters?.roundNo?.replace(/\D/g, '') ?? '';
    if (roundDigits) {
      clauses.push('(CAST(c.round_no AS CHAR) LIKE ? OR LPAD(c.round_no, 7, \'0\') LIKE ?)');
      const like = `%${roundDigits}%`;
      params.push(like, like);
    }
    if (filters?.createdFrom) {
      clauses.push('c.created_at >= ?');
      params.push(`${filters.createdFrom} 00:00:00`);
    }
    if (filters?.createdTo) {
      clauses.push('c.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
      params.push(`${filters.createdTo} 00:00:00`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await this.pool.query<CampaignRow[]>(
      `${this.baseSelect(where)} ORDER BY c.created_at DESC`,
      params,
    );
    return rows;
  }

  async findOneAdmin(id: number): Promise<CampaignRow> {
    const [rows] = await this.pool.query<CampaignRow[]>(
      `${this.baseSelect()} WHERE c.id = ?`,
      [id],
    );
    if (!rows.length) throw new NotFoundException({ error: 'Campaign not found' });
    return rows[0];
  }

  async create(
    productId: number,
    body: {
      roundNo?: number;
      totalShares?: number;
      pricePerShare?: number;
      autoDrawOnSellout?: boolean;
      autoDrawCountdownSeconds?: number;
      saleStartAt?: string | null;
      saleEndAt?: string | null;
    },
  ): Promise<{ id: number; message: string; numbersCount: number }> {
    const totalShares = Number(body.totalShares);
    const pricePerShare = this.validateIntegerPrice(body.pricePerShare ?? 1);
    const countdownSeconds = this.validateCountdownSeconds(body.autoDrawCountdownSeconds);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new BadRequestException({ error: 'Invalid product' });
    }
    if (!Number.isInteger(totalShares) || totalShares < 1) {
      throw new BadRequestException({ error: 'Invalid total shares' });
    }

    const [products] = await this.pool.query<RowDataPacket[]>(
      'SELECT id FROM products WHERE id = ?',
      [productId],
    );
    if (!products.length) throw new NotFoundException({ error: 'Product not found' });

    let roundNo = body.roundNo;
    const connection = await this.pool.getConnection();

    if (roundNo == null) {
      roundNo = await allocateNextRoundNo(connection, productId);
    } else if (!isValidCampaignRoundNo(roundNo)) {
      connection.release();
      throw new BadRequestException({
        error: 'Round number must be 7 digits: MMDD + sequence 001-999 (e.g. 0518001)',
      });
    }

    try {
      await connection.beginTransaction();
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO campaigns (
          product_id, round_no,
          total_shares, price_per_share, draw_mode, auto_draw_on_sellout, auto_draw_countdown_seconds,
          designated_winning_number, sale_start_at, sale_end_at, status, numbers_generated
        ) VALUES (?, ?, ?, ?, 'auto', ?, ?, NULL, ?, ?, 'draft', 0)`,
        [
          productId,
          roundNo,
          totalShares,
          pricePerShare,
          body.autoDrawOnSellout ? 1 : 0,
          countdownSeconds,
          body.saleStartAt || null,
          body.saleEndAt || null,
        ],
      );
      const campaignId = result.insertId;
      const count = await this.insertNumberPool(connection, campaignId, totalShares);
      await connection.commit();
      return {
        id: campaignId,
        message: 'Campaign created with promo numbers',
        numbersCount: count,
      };
    } catch (e: unknown) {
      await connection.rollback();
      const err = e as { code?: string };
      if (err.code === 'ER_DUP_ENTRY') {
        throw new BadRequestException({ error: 'Round number already exists for this product' });
      }
      if (e instanceof BadRequestException) throw e;
      throw new InternalServerErrorException({ error: 'Database error' });
    } finally {
      connection.release();
    }
  }

  async update(
    id: number,
    body: {
      autoDrawOnSellout?: boolean;
      autoDrawCountdownSeconds?: number;
      saleStartAt?: string | null;
      saleEndAt?: string | null;
    },
  ): Promise<{ message: string }> {
    const campaign = await this.findOneAdmin(id);
    if (!['draft', 'selling'].includes(campaign.status)) {
      throw new BadRequestException({ error: 'Only draft or selling campaigns can be edited' });
    }
    const segments: string[] = [];
    const values: unknown[] = [];
    if (body.autoDrawOnSellout !== undefined) {
      segments.push('auto_draw_on_sellout=?');
      values.push(body.autoDrawOnSellout ? 1 : 0);
    }
    if (body.autoDrawCountdownSeconds !== undefined) {
      segments.push('auto_draw_countdown_seconds=?');
      values.push(this.validateCountdownSeconds(body.autoDrawCountdownSeconds));
    }
    if (body.saleStartAt !== undefined) {
      segments.push('sale_start_at=?');
      values.push(body.saleStartAt || null);
    }
    if (body.saleEndAt !== undefined) {
      segments.push('sale_end_at=?');
      values.push(body.saleEndAt || null);
    }
    if (!segments.length) return { message: 'Nothing to update' };
    values.push(id);
    await this.pool.query(`UPDATE campaigns SET ${segments.join(', ')} WHERE id=?`, values);
    return { message: 'Campaign updated' };
  }

  async generateNumbers(id: number): Promise<{ message: string; count: number }> {
    const campaign = await this.findOneAdmin(id);
    if (campaign.status !== 'draft') {
      throw new BadRequestException({ error: 'Numbers can only be generated in draft status' });
    }
    if (campaign.numbers_generated) {
      throw new BadRequestException({ error: 'Numbers already generated for this campaign' });
    }
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const count = await this.insertNumberPool(connection, id, campaign.total_shares);
      await connection.commit();
      return { message: 'Promo numbers generated', count };
    } catch (e) {
      await connection.rollback();
      throw new InternalServerErrorException({ error: 'Failed to generate numbers' });
    } finally {
      connection.release();
    }
  }

  async publish(id: number): Promise<{ message: string }> {
    const campaign = await this.findOneAdmin(id);
    if (campaign.status !== 'draft') {
      throw new BadRequestException({ error: 'Only draft campaigns can be published' });
    }
    if (!campaign.numbers_generated) {
      throw new BadRequestException({ error: 'Generate promo numbers first' });
    }
    const [selling] = await this.pool.query<RowDataPacket[]>(
      "SELECT id FROM campaigns WHERE product_id = ? AND status = 'selling' AND id <> ?",
      [campaign.product_id, id],
    );
    if (selling.length) {
      throw new BadRequestException({
        error: 'This product already has a selling campaign. End it before publishing another.',
      });
    }
    await this.pool.query("UPDATE campaigns SET status = 'selling' WHERE id = ?", [id]);
    return { message: 'Campaign is now selling' };
  }

  async cancel(id: number): Promise<{ message: string }> {
    const campaign = await this.findOneAdmin(id);
    if (!['draft', 'selling'].includes(campaign.status)) {
      throw new BadRequestException({ error: 'Campaign cannot be cancelled in current status' });
    }
    await this.pool.query("UPDATE campaigns SET status = 'cancelled' WHERE id = ?", [id]);
    return { message: 'Campaign cancelled' };
  }

  /** 从码池分配 count 个可用码（下单） */
  async allocateNumbers(
    connection: PoolConnection,
    campaignId: number,
    userId: number,
    count: number,
  ): Promise<{
    numbers: string[];
    checkoutId: number;
    soldOut: boolean;
    campaign: CampaignRow;
  }> {
    const [campaigns] = await connection.query<CampaignRow[]>(
      'SELECT * FROM campaigns WHERE id = ? FOR UPDATE',
      [campaignId],
    );
    if (!campaigns.length) throw new Error('Campaign not found');
    const campaign = campaigns[0];
    if (campaign.status !== 'selling') throw new Error('Campaign is not open for purchase');
    if (!campaign.numbers_generated) throw new Error('Campaign number pool not ready');
    if (campaign.shares_sold + count > campaign.total_shares) {
      throw new Error('Not enough shares available');
    }

    const [slots] = await connection.query<RowDataPacket[]>(
      `SELECT id, number FROM lottery_numbers
       WHERE campaign_id = ? AND status = 'available'
       ORDER BY id
       LIMIT ${count}
       FOR UPDATE`,
      [campaignId],
    );
    if (slots.length < count) throw new Error('Not enough shares available');

    const numbers = slots.map((s) => String(s.number));
    const slotIds = slots.map((s) => s.id);

    const [checkoutResult] = await connection.query<ResultSetHeader>(
      'INSERT INTO checkouts (user_id, product_id, campaign_id, count, numbers) VALUES (?, ?, ?, ?, ?)',
      [
        userId,
        campaign.product_id,
        campaignId,
        count,
        JSON.stringify(numbers),
      ],
    );
    const checkoutId = checkoutResult.insertId;

    const placeholders = slotIds.map(() => '?').join(',');
    await connection.query(
      `UPDATE lottery_numbers SET status = 'sold', user_id = ?, checkout_id = ?, sold_at = NOW()
       WHERE id IN (${placeholders})`,
      [userId, checkoutId, ...slotIds],
    );

    await connection.query('UPDATE campaigns SET shares_sold = shares_sold + ? WHERE id = ?', [
      count,
      campaignId,
    ]);

    const [updated] = await connection.query<CampaignRow[]>(
      'SELECT * FROM campaigns WHERE id = ?',
      [campaignId],
    );
    const row = updated[0];
    const soldOut = Number(row.shares_sold) >= Number(row.total_shares);

    return { numbers, checkoutId, soldOut, campaign: row };
  }

  /** 满员且开启自动开奖：进入 sold_out 并记录筹满时间，倒计时结束后再开奖 */
  async scheduleAutoDrawAfterSellout(connection: PoolConnection, campaignId: number): Promise<void> {
    await connection.query(
      `UPDATE campaigns SET status = 'sold_out', sellout_at = NOW()
       WHERE id = ? AND shares_sold >= total_shares AND auto_draw_on_sellout = 1`,
      [campaignId],
    );
  }

  /**
   * 对单期执行自动开奖（定时任务 / 管理端补救均可调用）。
   * MySQL GET_LOCK(luckygo:auto_draw:{id})：多进程/多实例互斥；事务内 FOR UPDATE 防并发双开。
   * @returns 是否在本调用中完成开奖
   */
  async runAutoDrawIfDue(
    campaignId: number,
    options?: { toleranceMs?: number; source?: AutoDrawSource; jobId?: string },
  ): Promise<boolean> {
    const toleranceMs = options?.toleranceMs ?? 0;
    const source = options?.source ?? 'recovery-cron';
    const connection = await this.pool.getConnection();
    const lockName = `${AUTO_DRAW_MYSQL_LOCK_PREFIX}${campaignId}`;
    let lockHeld = false;
    try {
      const [lockRows] = await connection.query<RowDataPacket[]>(
        'SELECT GET_LOCK(?, 0) AS acquired',
        [lockName],
      );
      lockHeld = Number(lockRows[0]?.acquired) === 1;
      if (!lockHeld) {
        auditAutoDraw(this.logger, 'SKIP', {
          source,
          campaignId,
          reason: 'lock-held-by-other-worker',
        });
        return false;
      }

      auditAutoDraw(this.logger, 'TRIGGER', {
        source,
        campaignId,
        ...(options?.jobId ? { jobId: options.jobId } : {}),
      });

      await connection.beginTransaction();
      try {
        const [rows] = await connection.query<CampaignRow[]>(
          'SELECT * FROM campaigns WHERE id = ? FOR UPDATE',
          [campaignId],
        );
        if (!rows.length) {
          await connection.commit();
          auditAutoDraw(this.logger, 'SKIP', { source, campaignId, reason: 'not-found' });
          return false;
        }
        const c = rows[0];
        if (c.status !== 'sold_out' || !c.auto_draw_on_sellout || !c.sellout_at) {
          await connection.commit();
          auditAutoDraw(this.logger, 'SKIP', {
            source,
            campaignId,
            reason: `status=${c.status}`,
          });
          return false;
        }
        if (!this.isAutoDrawDue(c, toleranceMs)) {
          await connection.commit();
          auditAutoDraw(this.logger, 'SKIP', { source, campaignId, reason: 'not-due-yet' });
          return false;
        }
        const result = await this.executeDraw(connection, campaignId, c);
        await connection.commit();
        await this.dispatchTreasureWinNotification(result, campaignId);
        auditAutoDraw(this.logger, 'SUCCESS', {
          source,
          campaignId,
          winningNumber: String(result.winningNumber ?? ''),
          winnerUserId: result.winnerUserId == null ? 'none' : Number(result.winnerUserId),
        });
        return true;
      } catch (e) {
        await connection.rollback();
        throw e;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      auditAutoDraw(this.logger, 'FAIL', { source, campaignId, reason: msg });
      throw e;
    } finally {
      if (lockHeld) {
        await connection.query('SELECT RELEASE_LOCK(?)', [lockName]);
      }
      connection.release();
    }
  }

  async draw(id: number): Promise<Record<string, unknown>> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      auditAutoDraw(this.logger, 'TRIGGER', { source: 'manual-admin', campaignId: id });
      const result = await this.executeDraw(connection, id);
      await connection.commit();
      await this.dispatchTreasureWinNotification(result, id);
      auditAutoDraw(this.logger, 'SUCCESS', {
        source: 'manual-admin',
        campaignId: id,
        winningNumber: String(result.winningNumber ?? ''),
        winnerUserId: result.winnerUserId == null ? 'none' : Number(result.winnerUserId),
      });
      return result;
    } catch (e) {
      await connection.rollback();
      if (e instanceof NotFoundException || e instanceof BadRequestException) throw e;
      const msg = e instanceof Error ? e.message : 'Draw failed';
      throw new BadRequestException({ error: msg });
    } finally {
      connection.release();
    }
  }

  private async executeDraw(
    connection: PoolConnection,
    campaignId: number,
    lockedCampaign?: CampaignRow,
  ): Promise<Record<string, unknown>> {
    let campaign: CampaignRow;
    if (lockedCampaign) {
      campaign = lockedCampaign;
    } else {
      const [rows] = await connection.query<CampaignRow[]>(
        'SELECT c.*, p.title AS product_title FROM campaigns c JOIN products p ON c.product_id = p.id WHERE c.id = ? FOR UPDATE',
        [campaignId],
      );
      if (!rows.length) throw new NotFoundException({ error: 'Campaign not found' });
      campaign = rows[0];
    }

    if (!['selling', 'sold_out'].includes(campaign.status)) {
      throw new BadRequestException({ error: 'Campaign cannot be drawn in current status' });
    }

    if (!campaign.product_title) {
      const [productRows] = await connection.query<RowDataPacket[]>(
        'SELECT title FROM products WHERE id = ? LIMIT 1',
        [campaign.product_id],
      );
      campaign.product_title = productRows[0]?.title ? String(productRows[0].title) : '';
    }

    await connection.query("UPDATE campaigns SET status = 'drawing' WHERE id = ?", [campaignId]);

    let winningNumber: string;
    let winnerUserId: number | null = null;
    let drawProof: Record<string, unknown>;

    if (campaign.designated_winning_number) {
      winningNumber = this.formatNumber(Number(campaign.designated_winning_number));
      const [owner] = await connection.query<RowDataPacket[]>(
        'SELECT user_id, status FROM lottery_numbers WHERE campaign_id = ? AND number = ?',
        [campaignId, winningNumber],
      );
      if (owner.length && owner[0].status === 'sold') {
        winnerUserId = owner[0].user_id as number;
      }
      drawProof = {
        algorithm: 'designated',
        winningNumber,
        designated: true,
        winnerSold: winnerUserId != null,
        drawnAt: new Date().toISOString(),
      };
    } else {
      const [soldRows] = await connection.query<RowDataPacket[]>(
        "SELECT number, user_id FROM lottery_numbers WHERE campaign_id = ? AND status = 'sold' ORDER BY id",
        [campaignId],
      );
      if (!soldRows.length) {
        throw new BadRequestException({ error: 'No sold numbers to draw from' });
      }
      const soldNumbers = soldRows.map((r) => String(r.number));
      const seedMaterial = `LuckyGo|${campaignId}|${Date.now()}|${soldNumbers.length}`;
      const seedHash = createHash('sha256').update(seedMaterial).digest('hex');
      const index = Number(BigInt(`0x${seedHash.slice(0, 15)}`) % BigInt(soldNumbers.length));
      winningNumber = soldNumbers[index];
      winnerUserId = soldRows[index].user_id as number;
      const entriesHash = createHash('sha256').update(soldNumbers.join(',')).digest('hex');
      drawProof = {
        algorithm: 'sha256-seed-mod sold-pool',
        seedHash,
        entriesHash,
        totalSold: soldNumbers.length,
        winnerIndex: index,
        winningNumber,
        drawnAt: new Date().toISOString(),
      };
    }

    await connection.query(
      `UPDATE campaigns SET status = 'ended', winning_number = ?, winner_user_id = ?, draw_proof_json = ?, drawn_at = NOW() WHERE id = ?`,
      [winningNumber, winnerUserId, JSON.stringify(drawProof), campaignId],
    );

    const [winInsert] = await connection.query<ResultSetHeader>(
      `INSERT INTO winning_records (product_id, campaign_id, user_id, winning_number, status, draw_time, draw_proof_json)
       VALUES (?, ?, ?, ?, 'Processing', NOW(), ?)`,
      [
        campaign.product_id,
        campaignId,
        winnerUserId,
        winningNumber,
        JSON.stringify(drawProof),
      ],
    );

    const winningRecordId = await this.resolveWinningRecordId(
      connection,
      campaignId,
      winInsert,
    );

    return {
      message: 'Draw completed',
      campaignId,
      winningNumber,
      winnerUserId,
      winningRecordId,
      productTitle: String(campaign.product_title ?? ''),
      roundNo: campaign.round_no,
      drawProof,
    };
  }

  private readInsertId(header: ResultSetHeader | undefined): number {
    const raw = header?.insertId;
    const id = typeof raw === 'bigint' ? Number(raw) : Number(raw);
    return Number.isFinite(id) && id > 0 ? id : 0;
  }

  private async resolveWinningRecordId(
    connection: PoolConnection,
    campaignId: number,
    winInsert: ResultSetHeader,
  ): Promise<number> {
    const insertId = this.readInsertId(winInsert);
    if (insertId > 0) return insertId;

    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM winning_records WHERE campaign_id = ? ORDER BY id DESC LIMIT 1',
      [campaignId],
    );
    const fallbackId = Number(rows[0]?.id);
    if (Number.isFinite(fallbackId) && fallbackId > 0) {
      this.logger.warn(
        `winning_records insertId missing for campaign ${campaignId}, fallback id=${fallbackId}`,
      );
      return fallbackId;
    }
    return 0;
  }

  /**
   * 开奖事务提交后写入中奖通知（与充值成功一致，走独立连接）。
   * 若 result 无 winningRecordId（旧进程/热更新残留），按 campaign_id 回查最新 winning_records。
   */
  private async dispatchTreasureWinNotification(
    result: Record<string, unknown>,
    campaignId: number,
  ): Promise<void> {
    if (result.winnerUserId == null) {
      return;
    }

    let winningRecordId = Number(result.winningRecordId);
    if (!Number.isFinite(winningRecordId) || winningRecordId <= 0) {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        'SELECT id FROM winning_records WHERE campaign_id = ? ORDER BY id DESC LIMIT 1',
        [campaignId],
      );
      winningRecordId = Number(rows[0]?.id);
    }

    if (!Number.isFinite(winningRecordId) || winningRecordId <= 0) {
      this.logger.error(
        `treasure_win notification skipped: campaign=${campaignId} has no winning_records row`,
      );
      return;
    }

    const userId = Number(result.winnerUserId);
    try {
      await this.notifications.notifyTreasureWin({
        userId,
        winningId: winningRecordId,
        productTitle: String(result.productTitle ?? ''),
        roundNo: result.roundNo == null ? null : Number(result.roundNo),
        winningNumber: String(result.winningNumber ?? ''),
      });
      this.logger.log(
        `treasure_win notification created: user=${userId} winning=${winningRecordId} campaign=${campaignId}`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `treasure_win notification failed: user=${userId} winning=${winningRecordId} campaign=${campaignId} — ${msg}`,
      );
    }
  }

  async lookupNumber(campaignId: number, number: string): Promise<Record<string, unknown>> {
    const formatted = this.formatNumber(Number(number));
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ln.*, u.nickname, u.phone, c.round_no, p.title AS product_title
       FROM lottery_numbers ln
       JOIN campaigns c ON ln.campaign_id = c.id
       JOIN products p ON c.product_id = p.id
       LEFT JOIN users u ON ln.user_id = u.id
       WHERE ln.campaign_id = ? AND ln.number = ?`,
      [campaignId, formatted],
    );
    if (!rows.length) throw new NotFoundException({ error: 'Number not found in this campaign' });
    return rows[0];
  }

  async setDesignatedWinningNumber(
    id: number,
    number: string | null,
  ): Promise<{ message: string; designatedWinningNumber: string | null }> {
    const campaign = await this.findOneAdmin(id);
    if (!['draft', 'selling', 'sold_out'].includes(campaign.status)) {
      throw new BadRequestException({
        error: 'Designated number can only be set before draw completes',
      });
    }
    if (!campaign.numbers_generated) {
      throw new BadRequestException({ error: 'Campaign number pool not ready' });
    }

    let designated: string | null = number?.trim() ? this.formatNumber(Number(number.trim())) : null;
    if (designated) {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        'SELECT id FROM lottery_numbers WHERE campaign_id = ? AND number = ?',
        [id, designated],
      );
      if (!rows.length) {
        throw new BadRequestException({ error: 'Number not found in this campaign pool' });
      }
    }

    await this.pool.query('UPDATE campaigns SET designated_winning_number = ? WHERE id = ?', [
      designated,
      id,
    ]);
    return { message: designated ? 'Designated winning number set' : 'Designated winning number cleared', designatedWinningNumber: designated };
  }

  async getNumbersSummary(campaignId: number): Promise<Record<string, unknown>> {
    await this.findOneAdmin(campaignId);
    const [statusRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT status, COUNT(*) AS count FROM lottery_numbers WHERE campaign_id = ? GROUP BY status`,
      [campaignId],
    );
    const campaign = await this.findOneAdmin(campaignId);
    const breakdown: Record<string, number> = { available: 0, sold: 0 };
    statusRows.forEach((row) => {
      breakdown[String(row.status)] = Number(row.count);
    });
    return {
      campaignId,
      total: campaign.total_shares,
      available: breakdown.available ?? 0,
      sold: breakdown.sold ?? 0,
      designatedWinningNumber: campaign.designated_winning_number,
      winningNumber: campaign.winning_number,
    };
  }

  async listNumbers(
    campaignId: number,
    params: { status?: string; page?: number; pageSize?: number; search?: string },
  ): Promise<{ items: RowDataPacket[]; total: number; summary: Record<string, unknown> }> {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(params.pageSize) || 50));
    const offset = (page - 1) * pageSize;
    const clauses = ['campaign_id = ?'];
    const values: unknown[] = [campaignId];
    if (params.status) {
      clauses.push('ln.status = ?');
      values.push(params.status);
    }
    if (params.search?.trim()) {
      const q = params.search.trim().replace(/\D/g, '');
      if (q) {
        clauses.push('ln.number LIKE ?');
        values.push(`%${q}%`);
      }
    }
    const where = clauses.join(' AND ');
    const [countRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM lottery_numbers ln WHERE ${where}`,
      values,
    );
    const [items] = await this.pool.query<RowDataPacket[]>(
      `SELECT ln.id, ln.number, ln.status, ln.user_id, ln.checkout_id, ln.sold_at,
              u.nickname AS user_nickname, u.phone AS user_phone
       FROM lottery_numbers ln
       LEFT JOIN users u ON ln.user_id = u.id
       WHERE ${where}
       ORDER BY ln.sold_at IS NULL, ln.sold_at ASC, ln.number ASC
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset],
    );
    const summary = await this.getNumbersSummary(campaignId);
    return { items, total: Number(countRows[0].total), summary };
  }
}
