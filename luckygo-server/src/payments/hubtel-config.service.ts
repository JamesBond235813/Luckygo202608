import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HubtelConfigService {
  constructor(private readonly config: ConfigService) {}

  get mode(): string {
    const configured = this.config.get<string>('HUBTEL_MODE', 'production') ?? 'production';
    return configured.trim().toLowerCase();
  }

  get accountNumber(): string {
    return this.config.get<string>('HUBTEL_ACCOUNT_NUMBER', '2039172') ?? '2039172';
  }

  get apiId(): string {
    return this.config.get<string>('HUBTEL_API_ID', '') ?? '';
  }

  get apiKey(): string {
    return this.config.get<string>('HUBTEL_API_KEY', '') ?? '';
  }

  get initiateUrl(): string {
    return (
      this.config.get<string>('HUBTEL_INITIATE_URL') ??
      'https://payproxyapi.hubtel.com/items/initiate'
    );
  }

  get refundBaseUrl(): string {
    return (
      this.config.get<string>('HUBTEL_REFUND_BASE_URL') ??
      'https://refund-api.hubtel.com/refund'
    );
  }

  get statusUrl(): string {
    return (
      this.config.get<string>('HUBTEL_STATUS_URL') ??
      'https://api-txnstatus.hubtel.com/transactions'
    );
  }

  get callbackUrl(): string {
    return (
      this.config.get<string>('HUBTEL_CALLBACK_URL') ??
      'http://localhost:3000/api/payments/hubtel/callback'
    );
  }

  get refundCallbackUrl(): string {
    const explicit = this.config.get<string>('HUBTEL_REFUND_CALLBACK_URL');
    if (explicit?.trim()) return explicit.trim();
    return this.callbackUrl.replace(/\/callback\/?$/, '/refund-callback');
  }

  isSandbox(): boolean {
    return this.mode !== 'production';
  }

  isConfigured(): boolean {
    return Boolean(this.accountNumber && this.apiId && this.apiKey);
  }

  getPublicConfig() {
    return {
      provider: 'hubtel',
      mode: this.mode,
      currency: 'GHS',
      accountNumber: this.accountNumber,
      initiateUrl: this.initiateUrl,
      callbackUrl: this.callbackUrl,
      configured: this.isConfigured(),
      requiredEnv: [
        'HUBTEL_ACCOUNT_NUMBER',
        'HUBTEL_API_ID',
        'HUBTEL_API_KEY',
        'HUBTEL_CALLBACK_URL',
      ],
    };
  }
}
