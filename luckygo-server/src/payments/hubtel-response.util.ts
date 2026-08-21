/** Hubtel 成功响应码（与 PHP Pay::initiate 一致） */
export const HUBTEL_SUCCESS_CODE = '0000';

export function getHubtelResponseCode(payload: Record<string, unknown>): string {
  return String(payload.responseCode ?? payload.ResponseCode ?? '').trim();
}

export function getHubtelData(payload: Record<string, unknown>): Record<string, unknown> {
  const nested = payload.data ?? payload.Data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return payload;
}

/** initiate 必须 responseCode=0000，否则抛错（对齐 PHP） */
export function assertHubtelInitiateOk(payload: Record<string, unknown>): Record<string, unknown> {
  const code = getHubtelResponseCode(payload);
  if (code !== HUBTEL_SUCCESS_CODE) {
    const msg =
      (payload.message as string) ||
      (payload.Message as string) ||
      `Hubtel initiate failed (responseCode=${code || 'unknown'})`;
    throw new Error(msg);
  }
  return getHubtelData(payload);
}

/** Hubtel initiate / 回调里的收银台交易号 */
export function pickHubtelCheckoutId(payload: Record<string, unknown>): string | null {
  const data = getHubtelData(payload);
  const id = String(
    data.checkoutId ??
      data.CheckoutId ??
      payload.checkoutId ??
      payload.CheckoutId ??
      '',
  ).trim();
  return id || null;
}
