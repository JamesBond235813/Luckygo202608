/** 中奖记录履约状态（库内枚举；H5 展示为线下领取文案） */
export const WINNING_FULFILLMENT_STATUSES = ['Processing', 'Shipped', 'Received'] as const;

export type WinningFulfillmentStatus = (typeof WINNING_FULFILLMENT_STATUSES)[number];

/** 允许的下一状态；Received 为终态（线下领奖：待领取 → 已领取） */
export const WINNING_STATUS_NEXT: Record<WinningFulfillmentStatus, WinningFulfillmentStatus | null> = {
  Processing: 'Received',
  Shipped: 'Received',
  Received: null,
};

export function normalizeWinningStatus(raw: unknown): WinningFulfillmentStatus | null {
  const s = String(raw ?? '').trim();
  return (WINNING_FULFILLMENT_STATUSES as readonly string[]).includes(s)
    ? (s as WinningFulfillmentStatus)
    : null;
}
