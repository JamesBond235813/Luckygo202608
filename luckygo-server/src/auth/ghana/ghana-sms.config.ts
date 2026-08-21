import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_LOGIN_TEMPLATE =
  'Your verification code is {:code}, valid for 5 minutes';

@Injectable()
export class GhanaSmsConfig {
  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    const flag = (this.config.get<string>('SMS_GHANA_ENABLED', 'true') ?? 'true').toLowerCase();
    if (flag === '0' || flag === 'false' || flag === 'off') return false;
    return Boolean(this.appUrl && this.key && this.secret);
  }

  /** Sundex: https://api.sundexcloudsms.com/api/v1/messages/send */
  get appUrl(): string {
    return (this.config.get<string>('SMS_GHANA_APP_URL', '') ?? '').trim();
  }

  /** PHP config key */
  get key(): string {
    return (
      this.config.get<string>('SMS_GHANA_KEY', '') ??
      this.config.get<string>('SMS_GHANA_APP_ID', '') ??
      ''
    ).trim();
  }

  /** PHP config secret */
  get secret(): string {
    return (
      this.config.get<string>('SMS_GHANA_SECRET', '') ??
      this.config.get<string>('SMS_GHANA_APP_KEY', '') ??
      ''
    ).trim();
  }

  get sender(): string {
    return (this.config.get<string>('SMS_GHANA_SENDER', '') ?? '').trim();
  }

  get prefix(): string {
    return (this.config.get<string>('SMS_GHANA_PREFIX', '[Eba phones]') ?? '[Eba phones]').trim();
  }

  /** 场景 login_otp：登录 / 注册验证码 */
  get loginTemplateBody(): string {
    return (
      this.config.get<string>('SMS_GHANA_TEMPLATE_LOGIN_BODY', '')?.trim() ||
      DEFAULT_LOGIN_TEMPLATE
    );
  }

  /** 场景 marketing：营销短信（后续业务接入时使用） */
  get marketingTemplateBody(): string {
    return (this.config.get<string>('SMS_GHANA_TEMPLATE_MARKETING_BODY', '') ?? '').trim();
  }

  get apiTrace(): boolean {
    const v = this.config.get<string>('SMS_GHANA_API_TRACE', 'true') ?? 'true';
    return v !== '0' && v !== 'false' && v !== 'off';
  }

  get returnCodeInResponse(): boolean {
    const v = this.config.get<string>('H5_OTP_RETURN_CODE', 'false') ?? 'false';
    return v === '1' || v === 'true' || v === 'on';
  }

  get devBypassCode(): string {
    return (this.config.get<string>('H5_OTP_DEV_CODE', '888888') ?? '888888').trim();
  }

  /**
   * 本地/联调：除短信验证码外，可用 H5_OTP_DEV_CODE（默认 888888）直接通过校验。
   * 生产环境请在 .env 设 H5_OTP_DEV_BYPASS_ENABLED=false。
   */
  isDevBypassEnabled(): boolean {
    const explicit = (this.config.get<string>('H5_OTP_DEV_BYPASS_ENABLED', '') ?? '').trim().toLowerCase();
    if (explicit === '1' || explicit === 'true' || explicit === 'on') return true;
    if (explicit === '0' || explicit === 'false' || explicit === 'off') return false;
    const nodeEnv = (this.config.get<string>('NODE_ENV', 'development') ?? 'development').toLowerCase();
    return nodeEnv !== 'production';
  }

  matchesDevBypassCode(code: string): boolean {
    return this.isDevBypassEnabled() && String(code ?? '').trim() === this.devBypassCode;
  }

  hasGatewayCredentials(): boolean {
    return Boolean(this.appUrl && this.key && this.secret);
  }

  get codeTtlSeconds(): number {
    return Number(this.config.get<string>('SMS_GHANA_CODE_TTL', '300')) || 300;
  }

  /** 两次获取验证码之间的最短间隔（秒） */
  get cooldownSeconds(): number {
    return Number(this.config.get<string>('SMS_GHANA_COOLDOWN_TTL', '60')) || 60;
  }

  /** 统计窗口：窗口内最多可获取次数 */
  get requestWindowSeconds(): number {
    return Number(this.config.get<string>('SMS_GHANA_WINDOW_TTL', '300')) || 300;
  }

  get maxRequestsPerWindow(): number {
    return Number(this.config.get<string>('SMS_GHANA_MAX_REQUESTS', '5')) || 5;
  }

  /** @deprecated 使用 cooldownSeconds */
  get limitTtlSeconds(): number {
    return this.cooldownSeconds;
  }
}
