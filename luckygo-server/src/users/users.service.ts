import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';
import { GhanaSmsService } from '../auth/ghana/ghana-sms.service';
import {
  ghanaPhoneLookupVariants,
  ghanaPhonesEquivalent,
} from '../auth/ghana/ghana-phone.util';
import { MYSQL_POOL } from '../database/database.constants';
import { hashPassword, needsPasswordRehash, passwordMatches } from '../common/utils/password.util';
import { mapDrawCountdownFields } from '../campaigns/campaign-draw-countdown.util';
import { toAdminUserListItem, type AdminUserListItem } from './admin-user.util';
import { InviteRewardConfigService } from './invite-reward-config.service';
import { buildInviteMyRewards, type InviteMyRewardsPayload } from './invite-my-rewards.util';
import {
  insertTransaction,
  TX_ASSET_BEANS,
  TX_ASSET_BALANCE,
  TX_ASSET_EXCHANGE,
} from './transaction-ledger.util';
import { DEFAULT_COMPLIANCE_POLICY_VERSION } from '../settings/age-policy.constants';

const USER_PUBLIC_FIELDS =
  'u.id, u.nickname, u.avatar, u.balance, u.exchange_balance, u.beans, u.vip_level, u.phone, u.invite_code, u.invited_by_user_id, u.created_at, u.updated_at';

const USER_ADMIN_LIST_SQL = `
  SELECT ${USER_PUBLIC_FIELDS},
    inv.nickname AS inviter_nickname,
    inv.phone AS inviter_phone
  FROM users u
  LEFT JOIN users inv ON u.invited_by_user_id = inv.id`;

/** 金豆 → 游戏余额（exchange_balance）兑换比例：100 金豆 = 1 单位货币 */
export const BEANS_TO_GAME_BALANCE_RATIO = 100;

export type UserPublicRow = RowDataPacket & { total_balance: number };

@Injectable()
export class UsersService {
  constructor(
    @Inject(MYSQL_POOL) private readonly pool: Pool,
    private readonly ghanaSms: GhanaSmsService,
    private readonly inviteRewardConfig: InviteRewardConfigService,
  ) {}

  /** 可提现 balance + 仅夺宝可用 exchange_balance */
  augmentUserRow(row: RowDataPacket): UserPublicRow {
    const balance = Number.parseFloat(String(row.balance ?? 0));
    const ex = Number.parseFloat(String(row.exchange_balance ?? 0));
    const total = Number((balance + ex).toFixed(2));
    return { ...row, total_balance: total };
  }

  async findAll(): Promise<UserPublicRow[]> {
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        `${USER_ADMIN_LIST_SQL} ORDER BY u.created_at DESC`,
      );
      return rows.map((r) => this.augmentUserRow(r));
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  /** 管理端用户列表：不返回数据库主键 id */
  async findAllForAdmin(): Promise<AdminUserListItem[]> {
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        `${USER_ADMIN_LIST_SQL} ORDER BY u.created_at DESC`,
      );
      return rows.map((r) => toAdminUserListItem(r));
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  /** H5：我的邀请奖励统计与邀请名单（含本人填邀请码注册奖励） */
  async findMyInviteRewards(userId: number): Promise<InviteMyRewardsPayload> {
    try {
      const config = await this.inviteRewardConfig.getConfig();

      const [invitedRows] = await this.pool.query<RowDataPacket[]>(
        `SELECT u.nickname, u.phone, u.created_at,
          COALESCE(signup_grant.beans, 0) AS signup_reward_beans,
          COALESCE(spend_grant.beans, 0) AS spend_reward_beans
         FROM users u
         LEFT JOIN invite_reward_grants signup_grant
           ON signup_grant.invitee_user_id = u.id AND signup_grant.reward_type = 'signup'
         LEFT JOIN invite_reward_grants spend_grant
           ON spend_grant.invitee_user_id = u.id AND spend_grant.reward_type = 'spend'
         WHERE u.invited_by_user_id = ?
         ORDER BY u.created_at DESC
         LIMIT 100`,
        [userId],
      );

      const [selfRows] = await this.pool.query<RowDataPacket[]>(
        `SELECT inv.nickname, inv.phone, u.created_at,
          COALESCE(self_grant.beans, 0) AS signup_reward_beans,
          0 AS spend_reward_beans
         FROM users u
         INNER JOIN users inv ON u.invited_by_user_id = inv.id
         LEFT JOIN invite_reward_grants self_grant
           ON self_grant.invitee_user_id = u.id AND self_grant.reward_type = 'signup_invitee'
         WHERE u.id = ?
         LIMIT 1`,
        [userId],
      );

      const [spendSumRows] = await this.pool.query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(beans), 0) AS total FROM invite_reward_grants
         WHERE inviter_user_id = ? AND reward_type = 'spend'`,
        [userId],
      );
      const spendRewardBeans = Number(spendSumRows[0]?.total ?? 0);

      const selfRow = selfRows[0] ?? null;
      const fallbackSelfSignup =
        config.enabled && selfRow ? config.signupInviteeBeans : 0;

      return buildInviteMyRewards(
        invitedRows,
        selfRow,
        spendRewardBeans,
        fallbackSelfSignup,
      );
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async updateByInviteCode(
    inviteCode: string,
    body: {
      balance?: number;
      exchange_balance?: number;
      beans?: number;
      nickname?: string;
    },
  ): Promise<{ message: string }> {
    const code = String(inviteCode ?? '').trim();
    if (!code) {
      throw new BadRequestException({ error: 'Invite code is required' });
    }
    const [found] = await this.pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE invite_code = ? LIMIT 1',
      [code],
    );
    if (!found.length) {
      throw new NotFoundException({ error: 'User not found' });
    }
    return this.update(Number(found[0].id), body);
  }

  /** 管理端：按邀请码重置 H5 用户登录密码（无需旧密码） */
  async adminResetPasswordByInviteCode(
    inviteCode: string,
    password?: string,
  ): Promise<{ message: string }> {
    const code = String(inviteCode ?? '').trim();
    if (!code) {
      throw new BadRequestException({ error: 'Invite code is required' });
    }
    const pwd = String(password ?? '');
    if (pwd.length < 6) {
      throw new BadRequestException({ error: 'Password must be at least 6 characters' });
    }

    const [found] = await this.pool.query<RowDataPacket[]>(
      'SELECT id, vip_level FROM users WHERE invite_code = ? LIMIT 1',
      [code],
    );
    if (!found.length) {
      throw new NotFoundException({ error: 'User not found' });
    }
    if (Number(found[0].vip_level) >= 99) {
      throw new BadRequestException({ error: 'Cannot reset admin account password here' });
    }

    try {
      await this.pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [
        hashPassword(pwd),
        Number(found[0].id),
      ]);
      return { message: 'Password reset successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async findOne(id: number): Promise<UserPublicRow> {
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        `SELECT u.* FROM users u WHERE u.id = ?`,
        [id],
      );
      if (!rows.length) throw new NotFoundException({ error: 'User not found' });
      return this.augmentUserRow(rows[0]);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async hasAgeConfirmed(userId: number): Promise<boolean> {
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        'SELECT age_confirmed_at, age_policy_version FROM users WHERE id = ? LIMIT 1',
        [userId],
      );
      if (!rows[0]?.age_confirmed_at) return false;
      const version = String(rows[0].age_policy_version ?? '').trim();
      return version === DEFAULT_COMPLIANCE_POLICY_VERSION;
    } catch {
      // 未执行 age 字段迁移时视为未确认，避免接口 500
      return false;
    }
  }

  async confirmAge(
    userId: number,
    policyVersion = DEFAULT_COMPLIANCE_POLICY_VERSION,
  ): Promise<UserPublicRow> {
    try {
      await this.pool.query(
        'UPDATE users SET age_confirmed_at = NOW(), age_policy_version = ? WHERE id = ?',
        [policyVersion.slice(0, 32), userId],
      );
      return this.findOne(userId);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  /**
   * 金豆兑换为游戏余额（exchange_balance），不可提现；比例 100:1。
   */
  async exchangeBeansForGameBalance(
    userId: number,
    beans: number,
  ): Promise<{ message: string; beans: number; balance: number; exchange_balance: number; total_balance: number }> {
    if (!Number.isInteger(beans) || beans < 1) {
      throw new BadRequestException({ error: 'Beans amount must be a positive integer' });
    }

    const connection = await this.pool.getConnection();
    let committed = false;
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT beans, balance, exchange_balance FROM users WHERE id = ? FOR UPDATE',
        [userId],
      );
      if (!rows.length) {
        throw new NotFoundException({ error: 'User not found' });
      }
      const currentBeans = Number(rows[0].beans);
      if (currentBeans < beans) {
        throw new BadRequestException({ error: 'Insufficient beans' });
      }
      const credit = Number((beans / BEANS_TO_GAME_BALANCE_RATIO).toFixed(2));
      await connection.query(
        'UPDATE users SET beans = beans - ?, exchange_balance = exchange_balance + ? WHERE id = ?',
        [beans, credit, userId],
      );
      await insertTransaction(connection, {
        userId,
        type: 'BeanExchange',
        amount: 0,
        status: 'Success',
        method: 'beans_to_exchange',
        asset: TX_ASSET_BEANS,
        beansAmount: -beans,
      });
      await insertTransaction(connection, {
        userId,
        type: 'BeanExchange',
        amount: credit,
        status: 'Success',
        method: 'beans_to_exchange',
        asset: TX_ASSET_EXCHANGE,
        beansAmount: null,
      });
      await connection.commit();
      committed = true;

      const [afterRows] = await this.pool.query<RowDataPacket[]>(
        `SELECT u.id, u.nickname, u.avatar, u.balance, u.exchange_balance, u.beans, u.vip_level, u.phone, u.invite_code, u.invited_by_user_id, u.created_at, u.updated_at FROM users u WHERE u.id = ?`,
        [userId],
      );
      const fresh = this.augmentUserRow(afterRows[0]!);
      return {
        message: 'Beans exchanged for game balance',
        beans: Number(fresh.beans),
        balance: Number.parseFloat(String(fresh.balance)),
        exchange_balance: Number.parseFloat(String(fresh.exchange_balance)),
        total_balance: fresh.total_balance,
      };
    } catch (error) {
      if (!committed) {
        await connection.rollback();
      }
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException({ error: 'Database error' });
    } finally {
      connection.release();
    }
  }

  async findTransactions(userId: number): Promise<RowDataPacket[]> {
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
      );
      return rows;
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async findWinnings(userId: number): Promise<RowDataPacket[]> {
    const query = `
      SELECT w.*,
        p.title as product_title,
        p.image as product_image,
        COALESCE(c.price_per_share, 0) as product_price,
        c.round_no
      FROM winning_records w
      JOIN products p ON w.product_id = p.id
      LEFT JOIN campaigns c ON w.campaign_id = c.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `;
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(query, [userId]);
      return rows;
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  private parseCheckoutNumbers(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        return raw ? [raw] : [];
      }
    }
    return [];
  }

  /** 按期次聚合：同一 campaign 多次下单合并为一条 */
  async findParticipation(userId: number): Promise<RowDataPacket[]> {
    const groupQuery = `
      SELECT
        cam.id AS campaign_id,
        cam.product_id,
        MAX(p.title) AS product_title,
        MAX(p.image) AS product_image,
        cam.total_shares,
        cam.shares_sold,
        cam.round_no,
        cam.status AS campaign_status,
        cam.winning_number,
        cam.auto_draw_on_sellout,
        cam.auto_draw_countdown_seconds,
        cam.sellout_at,
        EXISTS(
          SELECT 1 FROM winning_records wr
          WHERE wr.campaign_id = cam.id AND wr.user_id = ?
        ) AS user_won,
        SUM(c.count) AS shares,
        COUNT(c.id) AS order_count,
        MAX(c.created_at) AS last_participated_at
      FROM checkouts c
      INNER JOIN campaigns cam ON c.campaign_id = cam.id
      LEFT JOIN products p ON cam.product_id = p.id
      WHERE c.user_id = ? AND c.campaign_id IS NOT NULL
      GROUP BY
        cam.id, cam.product_id,
        cam.total_shares, cam.shares_sold, cam.round_no, cam.status, cam.winning_number,
        cam.auto_draw_on_sellout, cam.auto_draw_countdown_seconds, cam.sellout_at
      ORDER BY last_participated_at DESC
    `;
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(groupQuery, [userId, userId]);
      const result: RowDataPacket[] = [];

      for (const row of rows) {
        const campaignId = Number(row.campaign_id);
        let numbers: string[] = [];

        try {
          const [numRows] = await this.pool.query<RowDataPacket[]>(
            `SELECT number FROM lottery_numbers
             WHERE campaign_id = ? AND user_id = ? AND status = 'sold'
             ORDER BY sold_at ASC, id ASC`,
            [campaignId, userId],
          );
          numbers = numRows.map((n) => String(n.number));
        } catch {
          const [checkoutRows] = await this.pool.query<RowDataPacket[]>(
            `SELECT numbers FROM checkouts
             WHERE user_id = ? AND campaign_id = ?
             ORDER BY created_at ASC`,
            [userId, campaignId],
          );
          const merged: string[] = [];
          checkoutRows.forEach((co) => {
            merged.push(...this.parseCheckoutNumbers(co.numbers));
          });
          numbers = [...new Set(merged)];
        }

        if (!numbers.length) {
          const [checkoutRows] = await this.pool.query<RowDataPacket[]>(
            `SELECT numbers FROM checkouts
             WHERE user_id = ? AND campaign_id = ?
             ORDER BY created_at ASC`,
            [userId, campaignId],
          );
          const merged: string[] = [];
          checkoutRows.forEach((co) => {
            merged.push(...this.parseCheckoutNumbers(co.numbers));
          });
          numbers = [...new Set(merged)];
        }

        const countdown = mapDrawCountdownFields({
          status: String(row.campaign_status ?? ''),
          auto_draw_on_sellout: row.auto_draw_on_sellout,
          sellout_at: row.sellout_at as Date | null,
          auto_draw_countdown_seconds: row.auto_draw_countdown_seconds as number,
        });

        result.push({
          ...row,
          ...countdown,
          id: campaignId,
          count: row.shares,
          numbers,
        });
      }

      return result;
    } catch (error) {
      console.error('[findParticipation]', error);
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  private async verifyUserPassword(userId: number, password: string): Promise<void> {
    const pwd = String(password ?? '');
    if (pwd.length < 6) {
      throw new BadRequestException({ error: 'Password must be at least 6 characters' });
    }
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
      [userId],
    );
    if (!rows.length) {
      throw new NotFoundException({ error: 'User not found' });
    }
    const hash = String(rows[0].password_hash ?? '');
    if (!hash) {
      throw new BadRequestException({ error: 'No password set for this account' });
    }
    if (!passwordMatches(pwd, hash)) {
      throw new UnauthorizedException({ error: 'Invalid password' });
    }
    if (needsPasswordRehash(hash)) {
      await this.pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(pwd), userId]);
    }
  }

  /** 更换绑定手机号：须验证当前账号密码，且新号未被其他用户占用 */
  async updatePhone(userId: number, phone?: string, password?: string): Promise<UserPublicRow> {
    if (!phone?.trim() || password == null || String(password).length === 0) {
      throw new BadRequestException({ error: 'Phone and password are required' });
    }

    await this.verifyUserPassword(userId, String(password));

    const trimmedPhone = phone.trim();
    const localPhone = this.ghanaSms.normalizePhoneLocal(trimmedPhone);
    if (!localPhone || !this.ghanaSms.isValidPhoneLocal(localPhone)) {
      throw new BadRequestException({ error: 'Phone number format error' });
    }

    const current = await this.findOne(userId);
    if (ghanaPhonesEquivalent(String(current.phone ?? ''), localPhone)) {
      throw new BadRequestException({ error: 'New phone number must be different from the current one' });
    }

    try {
      const lookupPhones = ghanaPhoneLookupVariants(trimmedPhone);
      const placeholders = lookupPhones.map(() => '?').join(', ');
      const [rows] = await this.pool.query<RowDataPacket[]>(
        `SELECT id FROM users WHERE phone IN (${placeholders}) AND id != ? LIMIT 1`,
        [...lookupPhones, userId],
      );
      if (rows.length) {
        throw new BadRequestException({ error: 'Phone number is already registered' });
      }

      await this.pool.query('UPDATE users SET phone = ? WHERE id = ?', [localPhone, userId]);
      return this.findOne(userId);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async updatePassword(
    userId: number,
    currentPassword?: string,
    newPassword?: string,
  ): Promise<UserPublicRow> {
    if (currentPassword == null || newPassword == null) {
      throw new BadRequestException({ error: 'Current password and new password are required' });
    }
    const nextPwd = String(newPassword);
    if (nextPwd.length < 6) {
      throw new BadRequestException({ error: 'Password must be at least 6 characters' });
    }

    await this.verifyUserPassword(userId, String(currentPassword));

    try {
      await this.pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [
        hashPassword(nextPwd),
        userId,
      ]);
      return this.findOne(userId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async updateMe(
    id: number,
    body: { nickname?: string; avatar?: string },
  ): Promise<UserPublicRow> {
    const segments: string[] = [];
    const values: unknown[] = [];
    if (body.nickname !== undefined) {
      const nickname = String(body.nickname).trim();
      if (!nickname) {
        throw new BadRequestException({ error: 'Nickname cannot be empty' });
      }
      segments.push('nickname=?');
      values.push(nickname);
    }
    if (body.avatar !== undefined) {
      const avatar = String(body.avatar).trim();
      if (!avatar) {
        throw new BadRequestException({ error: 'Avatar cannot be empty' });
      }
      segments.push('avatar=?');
      values.push(avatar);
    }
    if (!segments.length) {
      return this.findOne(id);
    }
    values.push(id);
    try {
      await this.pool.query(`UPDATE users SET ${segments.join(', ')} WHERE id=?`, values);
      return this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async update(
    id: number,
    body: {
      balance?: number;
      exchange_balance?: number;
      beans?: number;
      nickname?: string;
      avatar?: string;
    },
  ): Promise<{ message: string }> {
    const segments: string[] = [];
    const values: unknown[] = [];
    if (body.balance !== undefined) {
      segments.push('balance=?');
      values.push(body.balance);
    }
    if (body.exchange_balance !== undefined) {
      segments.push('exchange_balance=?');
      values.push(body.exchange_balance);
    }
    if (body.beans !== undefined) {
      segments.push('beans=?');
      values.push(body.beans);
    }
    if (body.nickname !== undefined) {
      segments.push('nickname=?');
      values.push(body.nickname);
    }
    if (body.avatar !== undefined) {
      segments.push('avatar=?');
      values.push(body.avatar);
    }
    if (!segments.length) {
      return { message: 'Nothing to update' };
    }
    values.push(id);
    try {
      await this.pool.query(`UPDATE users SET ${segments.join(', ')} WHERE id=?`, values);
      return { message: 'User updated' };
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }
}
