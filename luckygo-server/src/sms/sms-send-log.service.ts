import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';
import { maskGhanaPhone, normalizeGhanaPhoneLocal } from '../auth/ghana/ghana-phone.util';

export type SmsSendScene = 'login_otp' | 'marketing';

export interface SmsSendLogEntry {
  scene: SmsSendScene;
  phoneE164: string;
  contentPreview: string;
  status: 'success' | 'failed' | 'pending';
  gatewayErrcode?: string;
  gatewayMessage?: string;
}

@Injectable()
export class SmsSendLogService {
  private readonly logger = new Logger(SmsSendLogService.name);

  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  /** 写入发送记录；失败不影响主流程 */
  async record(entry: SmsSendLogEntry): Promise<void> {
    const phoneDisplay = entry.phoneE164 || normalizeGhanaPhoneLocal(entry.phoneE164);
    const phoneMasked = maskGhanaPhone(entry.phoneE164);
    const preview = entry.contentPreview.slice(0, 512);
    const gatewayErrcode = (entry.gatewayErrcode ?? '').slice(0, 32);
    const gatewayMessage = (entry.gatewayMessage ?? '').slice(0, 512);

    try {
      await this.pool.query(
        `INSERT INTO sms_send_logs (
          scene, phone, phone_masked, content_preview, status, gateway_errcode, gateway_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.scene,
          phoneDisplay,
          phoneMasked,
          preview,
          entry.status,
          gatewayErrcode,
          gatewayMessage,
        ],
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`[SmsSendLog] insert failed scene=${entry.scene} phone=${phoneMasked}: ${msg}`);
    }
  }
}
