import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';
import { InviteRewardConfigService } from './invite-reward-config.service';
import {
  INVITE_REWARD_TYPE_SIGNUP,
  INVITE_REWARD_TYPE_SIGNUP_INVITEE,
  INVITE_REWARD_TYPE_SPEND,
} from './invite-reward.constants';
import { insertBeanLedger } from './transaction-ledger.util';

type TxTotalsRow = RowDataPacket & { total: string | number };
type GrantBeansRow = RowDataPacket & { beans: string | number };

@Injectable()
export class InviteRewardsService {
  private readonly logger = new Logger(InviteRewardsService.name);

  constructor(
    @Inject(MYSQL_POOL) private readonly pool: Pool,
    private readonly inviteRewardConfig: InviteRewardConfigService,
  ) {}

  /** 注册成功：写入邀请人/新用户注册奖励记录（供「我的奖励」统计） */
  async recordSignupGrants(
    inviterUserId: number,
    inviteeUserId: number,
    inviterBeans: number,
    inviteeBeans: number,
  ): Promise<void> {
    if (inviterBeans > 0) {
      await this.pool.query(
        `INSERT INTO invite_reward_grants (inviter_user_id, invitee_user_id, reward_type, beans)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE beans = VALUES(beans)`,
        [inviterUserId, inviteeUserId, INVITE_REWARD_TYPE_SIGNUP, inviterBeans],
      );
      await insertBeanLedger(this.pool, inviterUserId, inviterBeans, 'Reward', 'invite_signup_inviter');
    }
    if (inviteeBeans > 0) {
      await this.pool.query(
        `INSERT INTO invite_reward_grants (inviter_user_id, invitee_user_id, reward_type, beans)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE beans = VALUES(beans)`,
        [inviterUserId, inviteeUserId, INVITE_REWARD_TYPE_SIGNUP_INVITEE, inviteeBeans],
      );
      await insertBeanLedger(this.pool, inviteeUserId, inviteeBeans, 'Reward', 'invite_signup_invitee');
    }
  }

  /**
   * 被邀请人每累计消费满一档，向邀请人发放对应金豆（可多次累加）。
   * 在夺宝消费或充值入账后调用；失败仅记日志，不影响主流程。
   */
  async tryGrantSpendRewardForInvitee(inviteeUserId: number): Promise<{ granted: boolean }> {
    if (!Number.isInteger(inviteeUserId) || inviteeUserId <= 0) {
      return { granted: false };
    }

    const config = await this.inviteRewardConfig.getConfig();
    if (!config.enabled || config.spendBeansPerUnit <= 0) {
      return { granted: false };
    }

    const connection = await this.pool.getConnection();
    try {
      return await this.tryGrantSpendRewardForInviteeWithConnection(
        connection,
        inviteeUserId,
        config,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`[InviteSpendReward] invitee=${inviteeUserId} failed: ${msg}`);
      return { granted: false };
    } finally {
      connection.release();
    }
  }

  private async tryGrantSpendRewardForInviteeWithConnection(
    connection: PoolConnection,
    inviteeUserId: number,
    config: Awaited<ReturnType<InviteRewardConfigService['getConfig']>>,
  ): Promise<{ granted: boolean }> {
    await connection.beginTransaction();

    const [users] = await connection.query<RowDataPacket[]>(
      'SELECT invited_by_user_id FROM users WHERE id = ? FOR UPDATE',
      [inviteeUserId],
    );
    const inviterUserId = Number(users[0]?.invited_by_user_id ?? 0);
    if (!inviterUserId) {
      await connection.rollback();
      return { granted: false };
    }

    const spendTotal = await this.sumSuccessfulTransactions(connection, inviteeUserId, 'Spend');
    const tierCount = Math.floor(spendTotal / config.spendUnitGhs);
    const shouldTotalBeans = tierCount * config.spendBeansPerUnit;
    if (shouldTotalBeans <= 0) {
      await connection.rollback();
      return { granted: false };
    }

    const [existing] = await connection.query<GrantBeansRow[]>(
      `SELECT beans FROM invite_reward_grants
       WHERE invitee_user_id = ? AND reward_type = ? FOR UPDATE`,
      [inviteeUserId, INVITE_REWARD_TYPE_SPEND],
    );
    const alreadyGranted = Number(existing[0]?.beans ?? 0);
    const deltaBeans = shouldTotalBeans - alreadyGranted;
    if (deltaBeans <= 0) {
      await connection.rollback();
      return { granted: false };
    }

    if (existing.length) {
      await connection.query(
        `UPDATE invite_reward_grants SET beans = beans + ? WHERE invitee_user_id = ? AND reward_type = ?`,
        [deltaBeans, inviteeUserId, INVITE_REWARD_TYPE_SPEND],
      );
    } else {
      await connection.query(
        `INSERT INTO invite_reward_grants (inviter_user_id, invitee_user_id, reward_type, beans)
         VALUES (?, ?, ?, ?)`,
        [inviterUserId, inviteeUserId, INVITE_REWARD_TYPE_SPEND, deltaBeans],
      );
    }

    await connection.query('UPDATE users SET beans = beans + ? WHERE id = ?', [
      deltaBeans,
      inviterUserId,
    ]);
    await insertBeanLedger(connection, inviterUserId, deltaBeans, 'Reward', 'invite_spend');
    await connection.commit();

    this.logger.log(
      `[InviteSpendReward] granted inviter=${inviterUserId} invitee=${inviteeUserId} +beans=${deltaBeans} spend=${spendTotal} totalGranted=${shouldTotalBeans}`,
    );
    return { granted: true };
  }

  private async sumSuccessfulTransactions(
    connection: PoolConnection,
    userId: number,
    type: 'Recharge' | 'Spend',
  ): Promise<number> {
    const [rows] = await connection.query<TxTotalsRow[]>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE user_id = ? AND type = ? AND status = 'Success'`,
      [userId, type],
    );
    return Number.parseFloat(String(rows[0]?.total ?? 0));
  }
}
