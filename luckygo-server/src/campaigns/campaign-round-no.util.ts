import { BadRequestException } from '@nestjs/common';
import type { Pool, PoolConnection } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

/** 加纳时区当日 MMDD，如 0518 */
export function getGhanaMmddPrefix(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Accra',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${month}${day}`;
}

/** 期号展示：0518001（7 位，不足补 0） */
export function formatCampaignRoundNo(roundNo: number): string {
  if (!Number.isFinite(roundNo) || roundNo <= 0) return '';
  return String(Math.trunc(roundNo)).padStart(7, '0');
}

function roundNoRangeForMmdd(mmdd: string): { min: number; max: number } {
  const base = Number(mmdd) * 1000;
  return { min: base + 1, max: base + 999 };
}

/**
 * 同一商品下按「当日 MMDD + 001~999」递增，如 0518001、0518002。
 * 跨日从新序号 001 开始（新 MMDD 前缀）。
 */
export async function allocateNextRoundNo(
  db: Pool | PoolConnection,
  productId: number,
  date = new Date(),
): Promise<number> {
  const mmdd = getGhanaMmddPrefix(date);
  const { min, max } = roundNoRangeForMmdd(mmdd);
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT COALESCE(MAX(round_no), 0) AS mx FROM campaigns
     WHERE product_id = ? AND round_no >= ? AND round_no <= ?`,
    [productId, min, max],
  );
  const mx = Number(rows[0]?.mx ?? 0);
  if (mx < min) return min;
  if (mx >= max) {
    throw new BadRequestException({
      error: `Daily round limit reached for this product (${formatCampaignRoundNo(max)})`,
    });
  }
  return mx + 1;
}

export function isValidCampaignRoundNo(roundNo: number): boolean {
  if (!Number.isInteger(roundNo) || roundNo <= 0) return false;
  const text = formatCampaignRoundNo(roundNo);
  if (!/^\d{7}$/.test(text)) return false;
  const seq = Number(text.slice(4));
  return seq >= 1 && seq <= 999;
}
