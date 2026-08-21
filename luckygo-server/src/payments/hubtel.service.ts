import { Injectable } from '@nestjs/common';
import { requestJson } from '../common/utils/http-post.util';
import { HubtelConfigService } from './hubtel-config.service';
import { assertHubtelInitiateOk, getHubtelResponseCode } from './hubtel-response.util';
import { pickHubtelCheckoutUrl } from './hubtel-status.util';

export interface HubtelInitiateParams {
  amount: number;
  clientReference: string;
  description: string;
  returnUrl: string;
  cancellationUrl: string;
}

export interface HubtelStatusQuery {
  checkoutId?: string;
  clientReference?: string;
}

type HttpMethod = 'get' | 'post';

@Injectable()
export class HubtelService {
  constructor(private readonly hubtel: HubtelConfigService) {}

  private authHeader(): string {
    return `Basic ${Buffer.from(`${this.hubtel.apiId}:${this.hubtel.apiKey}`).toString('base64')}`;
  }

  /**
   * 对齐 PHP Pay::send — Basic(apiId:apiKey)、POST JSON / GET query、30s 超时
   */
  private async sendHubtel(
    url: string,
    params: Record<string, string> = {},
    method: HttpMethod = 'post',
  ): Promise<Record<string, unknown>> {
    if (!this.hubtel.isConfigured()) {
      throw new Error(
        'Hubtel is not configured. Please set HUBTEL_ACCOUNT_NUMBER, HUBTEL_API_ID and HUBTEL_API_KEY.',
      );
    }
    const headers = {
      'Content-Type': 'application/json',
      Authorization: this.authHeader(),
    };
    const target =
      method === 'get'
        ? `${url}?${new URLSearchParams(params).toString()}`
        : url;
    const response = await requestJson(target, {
      method: method.toUpperCase(),
      headers,
      body: method === 'post' ? params : undefined,
      timeoutMs: 30_000,
    });
    const text = response.text;
    let data: Record<string, unknown> = {};
    if (text) {
      try {
        data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        data = { message: text };
      }
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        (data.message as string) || text || `Hubtel request failed with ${response.status}`,
      );
    }
    return data;
  }

  /**
   * 对齐 PHP Pay::initiate — POST payproxyapi/items/initiate，仅 responseCode=0000 为成功
   */
  async initiatePayment(params: HubtelInitiateParams): Promise<Record<string, unknown>> {
    if (this.hubtel.isSandbox()) {
      const checkoutId = `sandbox-${params.clientReference}`;
      const sep = params.returnUrl.includes('?') ? '&' : '?';
      const checkoutUrl = `${params.returnUrl}${sep}hubtelSandbox=success&checkoutId=${encodeURIComponent(checkoutId)}&clientReference=${encodeURIComponent(params.clientReference)}`;
      return {
        responseCode: '0000',
        status: 'sandbox',
        message: 'Hubtel sandbox checkout created.',
        checkoutId,
        checkoutUrl,
        clientReference: params.clientReference,
      };
    }

    const payload = {
      totalAmount: Number(params.amount).toFixed(2),
      description: params.description,
      callbackUrl: this.hubtel.callbackUrl,
      returnUrl: params.returnUrl,
      merchantAccountNumber: this.hubtel.accountNumber,
      cancellationUrl: params.cancellationUrl,
      clientReference: params.clientReference.slice(0, 36),
    };

    const res = await this.sendHubtel(this.hubtel.initiateUrl, payload);
    const data = assertHubtelInitiateOk(res);
    const checkoutUrl = pickHubtelCheckoutUrl(res) || pickHubtelCheckoutUrl(data);

    const checkoutId =
      String(data.checkoutId ?? data.CheckoutId ?? res.checkoutId ?? res.CheckoutId ?? '').trim() ||
      null;

    return {
      responseCode: getHubtelResponseCode(res),
      ...data,
      checkoutId,
      checkoutUrl,
      clientReference: params.clientReference,
    };
  }

  /**
   * 对齐 PHP Pay::transactionsStatus / query — GET txnstatus，优先 clientReference
   */
  async queryStatus(query: HubtelStatusQuery): Promise<Record<string, unknown>> {
    const checkoutId = query.checkoutId?.trim();
    const clientReference = query.clientReference?.trim();

    if (this.hubtel.isSandbox()) {
      return {
        responseCode: '0000',
        status: 'sandbox',
        transactionStatus: 'Success',
        checkoutId,
        clientReference,
      };
    }

    const params: Record<string, string> = {};
    if (clientReference) {
      params.clientReference = clientReference;
    } else if (checkoutId) {
      params.checkoutId = checkoutId;
    } else {
      throw new Error('checkoutId or clientReference is required for status query');
    }

    return this.sendHubtel(
      `${this.hubtel.statusUrl}/${this.hubtel.accountNumber}/status`,
      params,
      'get',
    );
  }

  /** 对齐 PHP Pay::refund */
  async refund(checkoutId: string, refundCallbackUrl?: string): Promise<Record<string, unknown>> {
    if (this.hubtel.isSandbox()) {
      return { responseCode: '0000', status: 'sandbox', refundStatus: 'Success', checkoutId };
    }
    const callbackUrl = refundCallbackUrl || this.hubtel.refundCallbackUrl;
    return this.sendHubtel(
      `${this.hubtel.refundBaseUrl}/${this.hubtel.accountNumber}/order/${checkoutId}`,
      { callbackUrl },
    );
  }
}
