import type { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';

export const TX_ASSET_BALANCE = 'balance';
export const TX_ASSET_EXCHANGE = 'exchange';
export const TX_ASSET_BEANS = 'beans';

export type TxAsset = typeof TX_ASSET_BALANCE | typeof TX_ASSET_EXCHANGE | typeof TX_ASSET_BEANS;

export async function insertTransaction(
  db: Pool | PoolConnection,
  row: {
    userId: number;
    type: string;
    amount: number;
    status: string;
    method?: string;
    asset?: TxAsset;
    beansAmount?: number | null;
  },
): Promise<number> {
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO transactions (user_id, type, amount, status, method, asset, beans_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      row.userId,
      row.type,
      row.amount,
      row.status,
      row.method ?? '',
      row.asset ?? TX_ASSET_BALANCE,
      row.beansAmount ?? null,
    ],
  );
  return result.insertId;
}

export async function insertBeanLedger(
  db: Pool | PoolConnection,
  userId: number,
  beansDelta: number,
  type: string,
  method: string,
  status = 'Success',
): Promise<void> {
  if (!beansDelta) return;
  await insertTransaction(db, {
    userId,
    type,
    amount: 0,
    status,
    method,
    asset: TX_ASSET_BEANS,
    beansAmount: beansDelta,
  });
}
