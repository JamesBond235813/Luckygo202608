import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import type { RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';
import { AutoDrawQueueService } from '../campaigns/auto-draw/auto-draw-queue.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { DEFAULT_AUTO_DRAW_COUNTDOWN_SECONDS } from '../campaigns/campaigns.constants';
import { MYSQL_POOL } from '../database/database.constants';
import { InviteRewardsService } from '../users/invite-rewards.service';
import {
  insertTransaction,
  TX_ASSET_BALANCE,
  TX_ASSET_EXCHANGE,
} from '../users/transaction-ledger.util';

const LIST_LIMIT = 1000;
const NUMBERS_PREVIEW_LIMIT = 24;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(MYSQL_POOL) private readonly pool: Pool,
    private readonly campaigns: CampaignsService,
    private readonly autoDrawQueue: AutoDrawQueueService,
    private readonly inviteRewards: InviteRewardsService,
  ) {}

  async listAll(): Promise<RowDataPacket[]> {
    const query = `
      SELECT 
        c.id, c.user_id, c.product_id, c.campaign_id, c.count, c.numbers, c.created_at,
        u.nickname AS user_nickname, u.phone AS user_phone,
        p.title AS product_title, p.image AS product_image,
        p.title AS campaign_title,
        cam.price_per_share, cam.total_shares, cam.shares_sold, cam.status AS campaign_status,
        cam.round_no,
        JSON_LENGTH(c.numbers) AS numbers_count
      FROM checkouts c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN products p ON c.product_id = p.id
      LEFT JOIN campaigns cam ON c.campaign_id = cam.id
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT ${LIST_LIMIT}
    `;
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(query);
      return rows.map((row) => {
        const total =
          Number(row.numbers_count) ||
          Number(row.count) ||
          0;
        let preview: string[] = [];
        try {
          const raw = row.numbers?.toString?.() ?? '[]';
          if (raw.length <= 120_000) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              preview = parsed.slice(0, NUMBERS_PREVIEW_LIMIT).map(String);
            }
          }
        } catch {
          preview = [];
        }
        const { numbers: _omit, ...rest } = row;
        return {
          ...rest,
          numbers: preview,
          numbers_count: total,
          numbers_truncated: total > preview.length,
        };
      });
    } catch (error) {
      console.error('[OrdersService.listAll]', error);
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async placeOrder(
    userId: number,
    body: {
      campaignId?: number;
      productId?: number;
      count?: number;
    },
  ): Promise<{ message: string; numbers: string[]; drawCountdown?: Record<string, unknown> }> {
    const campaignId = Number(body.campaignId ?? body.productId);
    const count = Number(body.count);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException({ error: 'Invalid user' });
    }

    if (!Number.isInteger(campaignId) || campaignId <= 0 || !Number.isInteger(count) || count <= 0) {
      throw new BadRequestException({ error: 'Invalid campaign or share count' });
    }

    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      const [users] = await connection.query<RowDataPacket[]>(
        'SELECT balance, exchange_balance FROM users WHERE id = ? FOR UPDATE',
        [userId],
      );
      if (!users.length) throw new Error('User not found');

      const exchangeBal = Number.parseFloat(String(users[0].exchange_balance ?? 0));
      const withdrawBal = Number.parseFloat(String(users[0].balance));

      const [campaignRows] = await connection.query<RowDataPacket[]>(
        'SELECT price_per_share, total_shares, shares_sold, auto_draw_on_sellout FROM campaigns WHERE id = ? FOR UPDATE',
        [campaignId],
      );
      if (!campaignRows.length) throw new Error('Campaign not found');
      const campaignMeta = campaignRows[0];
      const cost = Number((Number(campaignMeta.price_per_share) * count).toFixed(2));
      const available = Number((exchangeBal + withdrawBal).toFixed(2));
      if (available + 1e-9 < cost) throw new Error('Insufficient balance');

      const { numbers, soldOut, campaign } = await this.campaigns.allocateNumbers(
        connection,
        campaignId,
        userId,
        count,
      );

      const takeFromExchange = Math.min(exchangeBal, cost);
      const newExchange = Number((exchangeBal - takeFromExchange).toFixed(2));
      const newBalance = Number((withdrawBal - (cost - takeFromExchange)).toFixed(2));

      await connection.query('UPDATE users SET exchange_balance = ?, balance = ? WHERE id = ?', [
        newExchange,
        newBalance,
        userId,
      ]);

      const balancePart = Number((cost - takeFromExchange).toFixed(2));
      let spendAsset: typeof TX_ASSET_BALANCE | typeof TX_ASSET_EXCHANGE = TX_ASSET_EXCHANGE;
      let spendMethod = 'Balance';
      if (takeFromExchange <= 1e-9) {
        spendAsset = TX_ASSET_BALANCE;
      } else if (balancePart > 1e-9) {
        spendAsset = TX_ASSET_EXCHANGE;
        spendMethod = `balance_part:${balancePart}`;
      }
      await insertTransaction(connection, {
        userId,
        type: 'Spend',
        amount: cost,
        status: 'Success',
        method: spendMethod,
        asset: spendAsset,
      });

      let drawCountdown: Record<string, unknown> | undefined;
      let queueAfterCommit: { selloutAt: Date; countdownSeconds: number } | undefined;
      if (soldOut) {
        if (Number(campaign.auto_draw_on_sellout) === 1) {
          await this.campaigns.scheduleAutoDrawAfterSellout(connection, campaignId);
          const [afterRows] = await connection.query<RowDataPacket[]>(
            'SELECT auto_draw_countdown_seconds, sellout_at, status, auto_draw_on_sellout FROM campaigns WHERE id = ?',
            [campaignId],
          );
          if (afterRows.length) {
            const row = afterRows[0] as RowDataPacket & {
              auto_draw_countdown_seconds: number;
              sellout_at: Date;
              status: string;
              auto_draw_on_sellout: number;
            };
            const seconds =
              Number(row.auto_draw_countdown_seconds) || DEFAULT_AUTO_DRAW_COUNTDOWN_SECONDS;
            const selloutMs = row.sellout_at ? new Date(row.sellout_at).getTime() : Date.now();
            const drawAtMs = selloutMs + seconds * 1000;
            if (row.sellout_at) {
              queueAfterCommit = { selloutAt: row.sellout_at, countdownSeconds: seconds };
            }
            drawCountdown = {
              drawPending: row.status === 'sold_out' && Boolean(row.auto_draw_on_sellout),
              autoDrawCountdownSeconds: seconds,
              selloutAt: row.sellout_at ? new Date(row.sellout_at).toISOString() : null,
              drawScheduledAt: new Date(drawAtMs).toISOString(),
              drawCountdownRemaining: Math.max(0, Math.ceil((drawAtMs - Date.now()) / 1000)),
            };
          }
        } else {
          await connection.query("UPDATE campaigns SET status = 'sold_out' WHERE id = ?", [
            campaignId,
          ]);
        }
      }

      await connection.commit();

      void this.inviteRewards.tryGrantSpendRewardForInvitee(userId);

      if (queueAfterCommit) {
        try {
          await this.autoDrawQueue.scheduleAutoDraw(
            campaignId,
            queueAfterCommit.selloutAt,
            queueAfterCommit.countdownSeconds,
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.error(
            `Order ok but auto-draw queue failed for campaign ${campaignId}: ${msg}`,
          );
        }
      }

      return {
        message: 'Order placed successfully',
        numbers,
        ...(drawCountdown ? { drawCountdown } : {}),
      };
    } catch (error) {
      await connection.rollback();
      const msg = error instanceof Error ? error.message : 'Transaction failed';
      throw new BadRequestException({ error: msg });
    } finally {
      connection.release();
    }
  }
}
