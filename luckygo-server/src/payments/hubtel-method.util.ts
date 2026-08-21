/** 与库表 transactions.method 长度一致（未执行迁移前为 50） */
export const HUBTEL_METHOD_MAX_LEN = 50;

/** 写入 transactions.method：Hubtel + 本站支付单号 clientReference */
export function formatHubtelMethod(
  _checkoutId: string | null | undefined,
  clientReference: string,
): string {
  const ref = clientReference.trim().slice(0, HUBTEL_METHOD_MAX_LEN - 7);
  return `Hubtel:${ref}`.slice(0, HUBTEL_METHOD_MAX_LEN);
}

export function hubtelMethodLikePatterns(
  checkoutId?: string,
  clientReference?: string,
): string[] {
  const patterns: string[] = [];
  if (clientReference?.trim()) {
    const ref = clientReference.trim();
    patterns.push(`%${ref}%`);
    patterns.push(`%Hubtel:${ref}%`);
  }
  if (checkoutId?.trim()) {
    patterns.push(`%${checkoutId.trim()}%`);
  }
  return patterns;
}
