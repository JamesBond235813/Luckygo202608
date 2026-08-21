import { randomInt } from 'node:crypto';

/** 本站支付单号：YYYYMMDDHHmmss + 5 位随机数（共 19 位） */
export function generatePaymentClientReference(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts =
    `${now.getFullYear()}` +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());
  const suffix = String(randomInt(0, 100_000)).padStart(5, '0');
  return `${ts}${suffix}`;
}
