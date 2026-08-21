import { HUBTEL_SUCCESS_CODE } from './hubtel-response.util';
import { getHubtelData, getHubtelResponseCode } from './hubtel-response.util';

/** 判断 Hubtel 查询/回调 payload 是否表示支付成功 */
export function isHubtelPaymentSuccess(payload: Record<string, unknown>): boolean {
  const code = getHubtelResponseCode(payload);
  const data = getHubtelData(payload);
  if (code === HUBTEL_SUCCESS_CODE) return true;

  const status = String(
    data.status ??
      data.Status ??
      data.transactionStatus ??
      data.TransactionStatus ??
      payload.status ??
      payload.transactionStatus ??
      '',
  ).toLowerCase();

  return (
    status.includes('success') ||
    status.includes('paid') ||
    status === 'completed' ||
    status === 'successful'
  );
}

export function pickHubtelCheckoutUrl(payload: Record<string, unknown>): string | null {
  const data = getHubtelData(payload);

  const candidates = [
    data.checkoutUrl,
    data.checkoutDirectUrl,
    data.paymentUrl,
    data.redirectUrl,
    payload.checkoutUrl,
    payload.checkoutDirectUrl,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}
