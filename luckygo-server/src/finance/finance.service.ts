import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';

const LIST_LIMIT = 1000;

@Injectable()
export class FinanceService {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  private async listTransactions(whereSql: string, params: unknown[] = []): Promise<RowDataPacket[]> {
    const query = `
      SELECT
        t.id,
        t.user_id,
        t.type,
        t.amount,
        t.asset,
        t.beans_amount,
        t.status,
        t.method,
        t.created_at,
        t.updated_at,
        u.nickname AS user_nickname,
        u.phone AS user_phone
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE ${whereSql}
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT ${LIST_LIMIT}
    `;
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(query, params);
      return rows;
    } catch (error) {
      console.error('[FinanceService.listTransactions]', error);
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  /** Hubtel 等在线支付（payment_records） */
  async listPaymentRecords(): Promise<RowDataPacket[]> {
    const query = `
      SELECT
        pr.id,
        pr.user_id,
        'Recharge' AS type,
        pr.amount,
        pr.status,
        pr.checkout_id,
        pr.client_reference,
        pr.payment_type,
        pr.channel,
        pr.payer_phone,
        pr.hubtel_amount,
        pr.fee,
        pr.created_at,
        pr.updated_at,
        u.nickname AS user_nickname,
        u.phone AS user_phone
      FROM payment_records pr
      LEFT JOIN users u ON pr.user_id = u.id
      ORDER BY pr.created_at DESC, pr.id DESC
      LIMIT ${LIST_LIMIT}
    `;
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(query);
      return rows;
    } catch (error) {
      console.error('[FinanceService.listPaymentRecords]', error);
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  /** 全部余额变动流水（transactions，保持不变） */
  listBalanceTransactions() {
    return this.listTransactions('1=1');
  }

  /** 提现申请（withdrawal_records） */
  async listWithdrawalRecords(): Promise<RowDataPacket[]> {
    const query = `
      SELECT
        wr.id,
        wr.user_id,
        'Withdraw' AS type,
        wr.amount,
        wr.status,
        wr.channel AS method,
        wr.channel,
        wr.account_info,
        wr.checkout_id,
        wr.client_reference,
        wr.remark,
        wr.created_at,
        wr.updated_at,
        u.nickname AS user_nickname,
        u.phone AS user_phone
      FROM withdrawal_records wr
      LEFT JOIN users u ON wr.user_id = u.id
      ORDER BY wr.created_at DESC, wr.id DESC
      LIMIT ${LIST_LIMIT}
    `;
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(query);
      return rows;
    } catch (error) {
      console.error('[FinanceService.listWithdrawalRecords]', error);
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }
}
