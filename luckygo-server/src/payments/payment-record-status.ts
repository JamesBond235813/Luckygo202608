/** payment_records.status：与 transactions 的 Processing/Success 分离 */
export const PAYMENT_RECORD_STATUS = {
  UNPAID: 'Unpaid',
  PAID: 'Paid',
  REFUNDING: 'Refunding',
  REFUNDED: 'Refunded',
} as const;

export type PaymentRecordStatus =
  (typeof PAYMENT_RECORD_STATUS)[keyof typeof PAYMENT_RECORD_STATUS];

const LEGACY_TO_PAYMENT: Record<string, PaymentRecordStatus> = {
  Processing: PAYMENT_RECORD_STATUS.UNPAID,
  Failed: PAYMENT_RECORD_STATUS.UNPAID,
  Success: PAYMENT_RECORD_STATUS.PAID,
};

export function normalizePaymentRecordStatus(status: string): string {
  const s = String(status ?? '').trim();
  return LEGACY_TO_PAYMENT[s] ?? s;
}

export function isUnpaidPaymentStatus(status: string): boolean {
  return normalizePaymentRecordStatus(status) === PAYMENT_RECORD_STATUS.UNPAID;
}

export function isPaidPaymentStatus(status: string): boolean {
  return normalizePaymentRecordStatus(status) === PAYMENT_RECORD_STATUS.PAID;
}
