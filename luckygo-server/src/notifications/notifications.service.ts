import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { Pool, PoolConnection } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';
import {
  NOTIFICATION_REF_TYPE,
  NOTIFICATION_TYPE,
  type NotificationRefType,
} from './notification.constants';
import {
  buildRechargeSuccessContent,
  buildTreasureWinContent,
} from './notification-content.util';
import {
  buildRechargeSuccessPayload,
  buildTreasureWinPayload,
  type NotificationInsertInput,
} from './notification-payload.util';
import type { NotificationPayload, UserNotificationItem } from './notification.types';

type NotificationRow = RowDataPacket & {
  id: number;
  user_id: number;
  type: string;
  title_zh: string;
  title_en: string;
  body_zh: string;
  body_en: string;
  link_path: string | null;
  icon: string | null;
  ref_type: string;
  ref_id: number;
  payload_json: string | NotificationPayload | null;
  read_at: Date | string | null;
  created_at: Date | string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async listForUser(
    userId: number,
    limit = 80,
    readStatus: 'all' | 'read' | 'unread' = 'all',
  ): Promise<UserNotificationItem[]> {
    const safeLimit = Math.min(Math.max(Number(limit) || 80, 1), 200);
    let readClause = '';
    if (readStatus === 'unread') {
      readClause = 'AND read_at IS NULL';
    } else if (readStatus === 'read') {
      readClause = 'AND read_at IS NOT NULL';
    }
    try {
      const [rows] = await this.pool.query<NotificationRow[]>(
        `SELECT id, user_id, type, title_zh, title_en, body_zh, body_en, link_path, icon,
                ref_type, ref_id, payload_json, read_at, created_at
         FROM user_notifications
         WHERE user_id = ? ${readClause}
         ORDER BY created_at DESC
         LIMIT ?`,
        [userId, safeLimit],
      );
      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      this.logger.error(`listForUser failed: ${error instanceof Error ? error.message : error}`);
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async countUnread(userId: number): Promise<number> {
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS cnt FROM user_notifications WHERE user_id = ? AND read_at IS NULL`,
        [userId],
      );
      return Number(rows[0]?.cnt ?? 0);
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async markRead(userId: number, ids?: number[]): Promise<{ updated: number }> {
    try {
      if (ids?.length) {
        const placeholders = ids.map(() => '?').join(',');
        const [result] = await this.pool.query<ResultSetHeader>(
          `UPDATE user_notifications SET read_at = NOW()
           WHERE user_id = ? AND read_at IS NULL AND id IN (${placeholders})`,
          [userId, ...ids],
        );
        return { updated: result.affectedRows ?? 0 };
      }
      const [result] = await this.pool.query<ResultSetHeader>(
        `UPDATE user_notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL`,
        [userId],
      );
      return { updated: result.affectedRows ?? 0 };
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async notifyRechargeSuccess(
    userId: number,
    transactionId: number,
    amount: number,
  ): Promise<void> {
    const content = buildRechargeSuccessContent(amount);
    await this.insert({
      userId,
      type: NOTIFICATION_TYPE.RECHARGE_SUCCESS,
      refType: NOTIFICATION_REF_TYPE.TRANSACTION,
      refId: transactionId,
      titleZh: content.titleZh,
      titleEn: content.titleEn,
      bodyZh: content.bodyZh,
      bodyEn: content.bodyEn,
      linkPath: content.linkPath,
      icon: content.icon,
      payload: buildRechargeSuccessPayload(amount),
    });
  }

  async notifyTreasureWin(input: {
    userId: number;
    winningId: number;
    productTitle: string;
    roundNo?: number | null;
    winningNumber: string;
  }): Promise<void> {
    const content = buildTreasureWinContent(input);
    await this.insert({
      userId: input.userId,
      type: NOTIFICATION_TYPE.TREASURE_WIN,
      refType: NOTIFICATION_REF_TYPE.WINNING,
      refId: input.winningId,
      titleZh: content.titleZh,
      titleEn: content.titleEn,
      bodyZh: content.bodyZh,
      bodyEn: content.bodyEn,
      linkPath: content.linkPath,
      icon: content.icon,
      payload: buildTreasureWinPayload(input),
    });
  }

  private async insert(input: NotificationInsertInput, connection?: PoolConnection): Promise<void> {
    const sql = `INSERT INTO user_notifications (
        user_id, type, title_zh, title_en, body_zh, body_en, link_path, icon,
        ref_type, ref_id, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
      ON DUPLICATE KEY UPDATE user_notifications.ref_id = user_notifications.ref_id`;
    const params = [
      input.userId,
      input.type,
      input.titleZh,
      input.titleEn,
      input.bodyZh,
      input.bodyEn,
      input.linkPath,
      input.icon,
      input.refType,
      input.refId,
      JSON.stringify(input.payload),
    ];
    try {
      if (connection) {
        await connection.query(sql, params);
      } else {
        await this.pool.query(sql, params);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const message = `insert notification failed: user=${input.userId} type=${input.type} ref=${input.refType}:${input.refId} — ${detail}`;
      if (input.type === NOTIFICATION_TYPE.TREASURE_WIN) {
        this.logger.error(message);
        throw error;
      }
      this.logger.warn(message);
    }
  }

  private mapRow(row: NotificationRow): UserNotificationItem {
    const payload = this.parsePayload(row.payload_json);
    const readAt =
      row.read_at instanceof Date
        ? row.read_at.toISOString()
        : row.read_at
          ? String(row.read_at)
          : null;
    const texts = this.resolveStoredTexts(row, payload);
    return {
      id: String(row.id),
      type: String(row.type),
      title_zh: texts.title_zh,
      title_en: texts.title_en,
      body_zh: texts.body_zh,
      body_en: texts.body_en,
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at ?? ''),
      ref_id: Number(row.ref_id),
      ref_type: row.ref_type as NotificationRefType,
      read: readAt != null,
      read_at: readAt,
      link_path: row.link_path ? String(row.link_path) : undefined,
      icon: row.icon ? String(row.icon) : undefined,
      amount: payload.amount != null ? Number(payload.amount) : undefined,
      product_title: payload.product_title,
      round_no: payload.round_no ?? null,
      winning_number: payload.winning_number,
    };
  }

  /** 列优先；兼容旧 payload.localized */
  private resolveStoredTexts(
    row: NotificationRow,
    payload: NotificationPayload & {
      localized?: {
        title?: { zh?: string; en?: string };
        body?: { zh?: string; en?: string };
      };
    },
  ): { title_zh: string; title_en: string; body_zh: string; body_en: string } {
    let titleZh = String(row.title_zh ?? '').trim();
    let titleEn = String(row.title_en ?? '').trim();
    let bodyZh = String(row.body_zh ?? '').trim();
    let bodyEn = String(row.body_en ?? '').trim();

    const legacy = payload.localized;
    if (!titleZh && legacy?.title?.zh) titleZh = String(legacy.title.zh).trim();
    if (!titleEn && legacy?.title?.en) titleEn = String(legacy.title.en).trim();
    if (!bodyZh && legacy?.body?.zh) bodyZh = String(legacy.body.zh).trim();
    if (!bodyEn && legacy?.body?.en) bodyEn = String(legacy.body.en).trim();

    return { title_zh: titleZh, title_en: titleEn, body_zh: bodyZh, body_en: bodyEn };
  }

  private parsePayload(raw: NotificationRow['payload_json']): NotificationPayload {
    if (raw == null) return {};
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as NotificationPayload;
    }
    try {
      const parsed = JSON.parse(String(raw)) as NotificationPayload;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
}
