import type { ResultSetHeader } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { insertTransaction, TX_ASSET_BALANCE } from '../users/transaction-ledger.util';

/** 创建提现单 + 扣款流水（H5 提现接口接入时调用） */
export async function createWithdrawalWithTransaction(
  connection: PoolConnection,
  input: {
    userId: number;
    amount: number;
    channel: 'hubtel' | 'offline' | 'manual';
    accountInfo?: string;
    checkoutId?: string;
    clientReference?: string;
    remark?: string;
  },
): Promise<{ withdrawalId: number; ledgerTransactionId: number }> {
  const ledgerTransactionId = await insertTransaction(connection, {
    userId: input.userId,
    type: 'Withdraw',
    amount: input.amount,
    status: 'Processing',
    method: input.accountInfo?.trim() || input.channel,
    asset: TX_ASSET_BALANCE,
  });
  const [wrResult] = await connection.query<ResultSetHeader>(
    `INSERT INTO withdrawal_records (
      user_id, channel, amount, status,
      account_info, checkout_id, client_reference, remark
    ) VALUES (?, ?, ?, 'Processing', ?, ?, ?, ?)`,
    [
      input.userId,
      input.channel,
      input.amount,
      input.accountInfo?.trim() || null,
      input.checkoutId?.trim() || null,
      input.clientReference?.trim() || null,
      input.remark?.trim() || null,
    ],
  );
  return { withdrawalId: wrResult.insertId, ledgerTransactionId };
}
