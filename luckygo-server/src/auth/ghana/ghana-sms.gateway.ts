import { Injectable, Logger } from '@nestjs/common';
import { postJson } from '../../common/utils/http-post.util';
import { GhanaSmsConfig } from './ghana-sms.config';
import { maskGhanaPhone } from './ghana-phone.util';
import { buildSundexSign, renderSmsTemplate } from './sundex-sms.util';

export interface GhanaSmsSendResult {
  ok: boolean;
  errcode: string;
  error: string;
  raw?: unknown;
}

/**
 * Sundex Cloud SMS（与 PHP extend/sms/Sms::send 一致）
 * @see config/sms.php — app_url / key / secret / prefix / template.login
 */
@Injectable()
export class GhanaSmsGateway {
  private readonly logger = new Logger(GhanaSmsGateway.name);

  constructor(private readonly cfg: GhanaSmsConfig) {}

  async sendLoginCode(mobileE164: string, code: string): Promise<GhanaSmsSendResult> {
    const timestamp = Date.now();
    const sign = buildSundexSign(this.cfg.key, this.cfg.secret, timestamp);

    const messageBody = renderSmsTemplate(this.cfg.loginTemplateBody, [code]);
    const content = `${this.cfg.prefix}${messageBody}`;
    const mobiles = mobileE164.replace(/^\+/, '');

    const body = {
      appId: this.cfg.key,
      content,
      mobiles,
    };

    const url = this.cfg.appUrl;
    if (this.cfg.apiTrace) {
      this.logger.log(
        `[GhanaSms/API] url=${url} mobiles=${mobiles} content_length=${content.length} masked=${maskGhanaPhone(mobileE164)}`,
      );
    }

    try {
      const response = await postJson(url, body, {
        sign,
        timestamp: String(timestamp),
      });

      const text = response.text;
      let data: Record<string, unknown> = {};
      try {
        data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        data = { raw: text };
      }

      const errcode = String(data.code ?? '');
      const error = String(data.msg ?? data.message ?? '');
      const ok = errcode === '200';

      if (this.cfg.apiTrace) {
        const snippet = text.length > 2000 ? `${text.slice(0, 2000)}...(truncated)` : text;
        this.logger.log(
          `[GhanaSms/API] raw_response=${snippet} parsed code=${errcode} msg=${error || '(empty)'}`,
        );
      }

      return { ok, errcode, error, raw: data };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`[GhanaSms] gateway request failed: ${msg}`);
      return { ok: false, errcode: '-1', error: msg };
    }
  }
}
