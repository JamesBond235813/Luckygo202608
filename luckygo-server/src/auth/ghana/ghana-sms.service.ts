import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SmsSendLogService } from '../../sms/sms-send-log.service';
import { GhanaSmsConfig } from './ghana-sms.config';
import { GhanaSmsGateway } from './ghana-sms.gateway';
import { GhanaSmsOtpStore } from './ghana-sms-otp.store';
import { renderSmsTemplate } from './sundex-sms.util';
import {
  isValidGhanaE164,
  isValidGhanaLocal,
  maskGhanaPhone,
  normalizeGhanaPhone,
  normalizeGhanaPhoneLocal,
} from './ghana-phone.util';

@Injectable()
export class GhanaSmsService {
  private readonly logger = new Logger(GhanaSmsService.name);

  constructor(
    private readonly cfg: GhanaSmsConfig,
    private readonly store: GhanaSmsOtpStore,
    private readonly gateway: GhanaSmsGateway,
    private readonly sendLogs: SmsSendLogService,
  ) {}

  isEnabled(): boolean {
    return this.cfg.isEnabled();
  }

  /** 是否调用 Sundex 真实发短信（仅 SMS_GHANA_ENABLED=true 且 Key/Secret 已配置） */
  canSendSms(): boolean {
    return this.cfg.isEnabled();
  }

  /** 短信 / OTP 用 E.164（+233 + 9 位） */
  normalizePhone(phone: string): string {
    return normalizeGhanaPhone(phone);
  }

  /** 数据库存储用本地 10 位（0 + 9 位） */
  normalizePhoneLocal(phone: string): string {
    return normalizeGhanaPhoneLocal(phone);
  }

  isValidPhoneLocal(phone: string): boolean {
    return isValidGhanaLocal(phone);
  }

  /**
   * 发送登录验证码（加纳号）
   * @returns 本次下发的验证码（仅内部/联调用；响应是否带回由 H5_OTP_RETURN_CODE 控制）
   */
  async sendLoginVerificationCode(phone: string): Promise<string> {
    const canonical = normalizeGhanaPhone(phone);
    if (!canonical || !isValidGhanaE164(canonical)) {
      throw new BadRequestException({ error: 'Phone number format error' });
    }

    const cooldownKey = this.store.cooldownKey(canonical);
    if (await this.store.has(cooldownKey)) {
      throw new BadRequestException({
        error: 'Please wait before requesting another verification code',
        code: 'OTP_COOLDOWN',
      });
    }

    const windowKey = this.store.windowKey(canonical);
    const requestCount = await this.store.incr(windowKey);
    if (requestCount === 1) {
      await this.store.expire(windowKey, this.cfg.requestWindowSeconds);
    }
    if (requestCount > this.cfg.maxRequestsPerWindow) {
      await this.store.decr(windowKey);
      throw new BadRequestException({
        error: 'Too many verification code requests. Please try again in a few minutes.',
        code: 'OTP_RATE_LIMIT',
      });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeKey = this.store.codeKey(canonical);
    const codeBackend = await this.store.set(codeKey, code, this.cfg.codeTtlSeconds);
    const cooldownBackend = await this.store.set(cooldownKey, '1', this.cfg.cooldownSeconds);

    this.logger.log(
      `[GhanaSms] otp cached backend=${codeBackend} key=${codeKey} ttl=${this.cfg.codeTtlSeconds}s cooldown_backend=${cooldownBackend} window_count=${requestCount}`,
    );

    this.logger.log(
      `[GhanaSms] send start input=${phone} canonical=${maskGhanaPhone(canonical)} app_url=${this.cfg.appUrl}`,
    );

    const messageBody = renderSmsTemplate(this.cfg.loginTemplateBody, [code]);
    const fullContent = `${this.cfg.prefix}${messageBody}`;
    const contentPreview = fullContent.slice(0, 512);

    const result = await this.gateway.sendLoginCode(canonical, code);

    this.logger.log(
      `[GhanaSms] send done ok=${result.ok ? 1 : 0} gateway_errcode=${result.errcode} gateway_msg=${result.error || '(empty)'}`,
    );

    await this.sendLogs.record({
      scene: 'login_otp',
      phoneE164: canonical,
      contentPreview,
      status: result.ok ? 'success' : 'failed',
      gatewayErrcode: result.errcode,
      gatewayMessage: result.error,
    });

    if (!result.ok) {
      await this.store.delete(codeKey);
      await this.store.delete(cooldownKey);
      await this.store.decr(windowKey);
      throw new BadRequestException({
        error: result.error || 'SMS send failed',
      });
    }

    return code;
  }

  /**
   * 校验 OTP：本地/联调可用通用码（默认 888888）；否则校验 Redis 中的短信验证码。
   */
  async verifyOtpCode(phone: string, code: string): Promise<boolean> {
    if (this.cfg.matchesDevBypassCode(code)) {
      return true;
    }
    if (!this.canSendSms()) {
      return false;
    }
    return this.verifyLoginCodeFromStore(phone, code);
  }

  /** @deprecated 请使用 verifyOtpCode */
  async verifyLoginCode(phone: string, code: string): Promise<boolean> {
    return this.verifyOtpCode(phone, code);
  }

  private async verifyLoginCodeFromStore(phone: string, code: string): Promise<boolean> {
    const canonical = normalizeGhanaPhone(phone);
    if (!canonical) return false;

    const cached = await this.store.get(this.store.codeKey(canonical));
    if (!cached || String(cached) !== String(code).trim()) {
      return false;
    }

    await this.store.delete(this.store.codeKey(canonical));
    return true;
  }
}
