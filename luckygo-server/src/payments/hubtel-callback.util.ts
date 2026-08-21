import { createHmac, timingSafeEqual } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { HUBTEL_SUCCESS_CODE, getHubtelData, getHubtelResponseCode } from './hubtel-response.util';

/** Hubtel 回调 2001：预留，后续可重新发起收银台（对齐 PHP payNotify） */
export const HUBTEL_CALLBACK_RETRY_CODE = '2001';

export function assertHubtelCallbackSignature(
  rawBody: Buffer | undefined,
  signature: string | undefined,
  secret: string | undefined,
  required: boolean,
): void {
  if (!required && !secret) return;
  if (!rawBody || !signature || !secret) {
    throw new UnauthorizedException({ error: 'Invalid payment callback signature' });
  }
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = signature.trim().replace(/^sha256=/i, '');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(received, 'utf8');
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new UnauthorizedException({ error: 'Invalid payment callback signature' });
  }
}

export type ParsedHubtelCallback = {
  responseCode: string;
  topStatus: string;
  checkoutId: string;
  clientReference: string;
  hubtelAmount: number | null;
  paymentType: string;
  channel: string;
  payerPhone: string;
};

export function summarizeCallbackBody(body: Record<string, unknown>, maxLen = 1800): string {
  try {
    const raw = JSON.stringify(body);
    return raw.length <= maxLen ? raw : `${raw.slice(0, maxLen)}…`;
  } catch {
    return '[unserializable body]';
  }
}

/** 解析 Hubtel 异步回调（支持 Data / data 嵌套） */
export function parseHubtelCallback(body: Record<string, unknown>): ParsedHubtelCallback {
  const data = getHubtelData(body);
  const paymentDetails =
    data.PaymentDetails && typeof data.PaymentDetails === 'object' && !Array.isArray(data.PaymentDetails)
      ? (data.PaymentDetails as Record<string, unknown>)
      : data.paymentDetails && typeof data.paymentDetails === 'object' && !Array.isArray(data.paymentDetails)
        ? (data.paymentDetails as Record<string, unknown>)
        : {};

  const checkoutId = String(
    data.CheckoutId ??
      data.checkoutId ??
      body.CheckoutId ??
      body.checkoutId ??
      '',
  ).trim();

  const clientReference = String(
    data.ClientReference ??
      data.clientReference ??
      body.ClientReference ??
      body.clientReference ??
      '',
  ).trim();

  const amountRaw = data.Amount ?? data.amount ?? body.Amount ?? body.amount;
  const hubtelAmount =
    amountRaw == null || amountRaw === '' ? null : Number.parseFloat(String(amountRaw));

  return {
    responseCode: getHubtelResponseCode(body),
    topStatus: String(body.Status ?? body.status ?? data.Status ?? data.status ?? '').trim(),
    checkoutId,
    clientReference,
    hubtelAmount: Number.isFinite(hubtelAmount) ? hubtelAmount : null,
    paymentType: String(
      paymentDetails.PaymentType ?? paymentDetails.paymentType ?? '',
    ).trim(),
    channel: String(paymentDetails.Channel ?? paymentDetails.channel ?? '').trim(),
    payerPhone: String(
      data.CustomerPhoneNumber ?? data.customerPhoneNumber ?? '',
    ).trim(),
  };
}

/** 回调入账条件：Status=Success 且 ResponseCode=0000（对齐 PHP） */
export function isHubtelCallbackSuccess(body: Record<string, unknown>): boolean {
  const parsed = parseHubtelCallback(body);
  return parsed.topStatus === 'Success' && parsed.responseCode === HUBTEL_SUCCESS_CODE;
}

export function isHubtelCallbackRetryCode(body: Record<string, unknown>): boolean {
  return getHubtelResponseCode(body) === HUBTEL_CALLBACK_RETRY_CODE;
}

/**
 * Hubtel Amount 可能含手续费；入账仍用订单金额，仅校验实付 ≥ 订单且手续费在合理范围。
 */
export function validateHubtelPaidAmount(
  hubtelAmount: number,
  orderAmount: number,
): { ok: boolean; fee: number; reason?: string } {
  const order = Number(orderAmount.toFixed(2));
  const paid = Number(hubtelAmount.toFixed(2));
  const fee = Number((paid - order).toFixed(2));

  if (paid + 1e-9 < order) {
    return { ok: false, fee, reason: 'paid-less-than-order' };
  }

  const maxFee = Math.max(1, order * 0.02);
  if (fee > maxFee + 0.01) {
    return { ok: false, fee, reason: 'fee-over-tolerance' };
  }

  return { ok: true, fee: Math.max(0, fee) };
}

export type PaymentRecordSuccessPatch = {
  paymentType: string | null;
  channel: string | null;
  payerPhone: string | null;
  hubtelAmount: number | null;
  fee: number | null;
  callbackPayloadJson: string | null;
};

export function buildPaymentRecordSuccessPatch(
  meta: {
    paymentType?: string;
    channel?: string;
    payerPhone?: string;
    hubtelPaidAmount?: number | null;
    callbackPayload?: Record<string, unknown>;
  },
  orderAmount: number,
): PaymentRecordSuccessPatch {
  let fee: number | null = null;
  if (meta.hubtelPaidAmount != null) {
    fee = validateHubtelPaidAmount(meta.hubtelPaidAmount, orderAmount).fee;
  }

  let callbackPayloadJson: string | null = null;
  if (meta.callbackPayload) {
    try {
      callbackPayloadJson = JSON.stringify(meta.callbackPayload);
    } catch {
      callbackPayloadJson = null;
    }
  }

  return {
    paymentType: meta.paymentType?.trim() || null,
    channel: meta.channel?.trim() || null,
    payerPhone: meta.payerPhone?.trim() || null,
    hubtelAmount: meta.hubtelPaidAmount ?? null,
    fee,
    callbackPayloadJson,
  };
}
