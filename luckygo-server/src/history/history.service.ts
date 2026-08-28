import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';
import {
  normalizeWinningStatus,
  WINNING_FULFILLMENT_STATUSES,
  WINNING_STATUS_NEXT,
} from './winning-status.constants';
import { normalizeGhanaPhoneLocal } from '../auth/ghana/ghana-phone.util';

@Injectable()
export class HistoryService {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async getPublicHistory(): Promise<RowDataPacket[]> {
    const query = `
      SELECT w.*, 
             p.title as productName,
             p.image as productImage,
             COALESCE(c.total_shares, 0) as totalShares,
             c.round_no as issue,
             u.nickname as winnerName,
             u.avatar as winnerAvatar,
             'Accra, GH' as winnerLocation,
             COALESCE(w.draw_proof_json->>'$.entriesHash', '') as valueA,
             COALESCE(c.total_shares, 0) as valueB
      FROM winning_records w
      JOIN products p ON w.product_id = p.id
      LEFT JOIN campaigns c ON w.campaign_id = c.id
      LEFT JOIN users u ON w.user_id = u.id
      ORDER BY w.draw_time DESC
    `;
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(query);
      const campaignIds = rows
        .map((row) => Number(row.campaign_id))
        .filter((id) => Number.isInteger(id) && id > 0);
      if (campaignIds.length) {
        const [entries] = await this.pool.query<RowDataPacket[]>(
          `SELECT ln.campaign_id, ln.user_id, u.phone,
                  DATE_FORMAT(ln.sold_at, '%Y-%m-%d %H:%i:%s') AS bet_time,
                  COUNT(*) AS shares
           FROM lottery_numbers ln
           JOIN users u ON u.id = ln.user_id
           WHERE ln.status = 'sold' AND ln.sold_at IS NOT NULL AND ln.campaign_id IN (?)
           GROUP BY ln.campaign_id, ln.user_id, u.phone, DATE_FORMAT(ln.sold_at, '%Y-%m-%d %H:%i:%s')
           ORDER BY ln.campaign_id DESC, bet_time ASC`,
          [campaignIds],
        );
        const entriesByCampaign = new Map<number, Array<Record<string, unknown>>>();
        for (const entry of entries) {
          const campaignId = Number(entry.campaign_id);
          const localPhone = normalizeGhanaPhoneLocal(String(entry.phone ?? ''));
          const maskedPhone = localPhone
            ? `${localPhone.slice(0, 2)}****${localPhone.slice(-3)}`
            : '***';
          const list = entriesByCampaign.get(campaignId) ?? [];
          list.push({
            phone: maskedPhone,
            betTime: String(entry.bet_time ?? ''),
            shares: Number(entry.shares ?? 0),
            userId: Number(entry.user_id),
          });
          entriesByCampaign.set(campaignId, list);
        }
        for (const row of rows) {
          const campaignId = Number(row.campaign_id);
          const winnerId = Number(row.user_id);
          row.entries = (entriesByCampaign.get(campaignId) ?? [])
            .filter((entry) => Number(entry.userId) !== winnerId)
            .map(({ userId: _userId, ...entry }) => entry);
        }
      }
      return rows;
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async getAdminWinnings(): Promise<RowDataPacket[]> {
    const query = `
      SELECT w.*, 
             p.title as productName, 
             p.image as productImage,
             c.round_no,
             u.nickname as winnerName,
             u.phone as winnerPhone
      FROM winning_records w
      JOIN products p ON w.product_id = p.id
      LEFT JOIN campaigns c ON w.campaign_id = c.id
      LEFT JOIN users u ON w.user_id = u.id
      ORDER BY w.created_at DESC
    `;
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(query);
      return rows;
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async updateWinningStatus(id: number, status: string): Promise<{ message: string }> {
    const next = normalizeWinningStatus(status);
    if (!next) {
      throw new BadRequestException({
        error: `Invalid status. Allowed: ${WINNING_FULFILLMENT_STATUSES.join(', ')}`,
      });
    }

    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        'SELECT status FROM winning_records WHERE id = ? LIMIT 1',
        [id],
      );
      if (!rows.length) {
        throw new NotFoundException({ error: 'Winning record not found' });
      }

      const current = normalizeWinningStatus(rows[0].status) ?? 'Processing';
      if (current === next) {
        return { message: 'Status unchanged' };
      }

      const allowedNext = WINNING_STATUS_NEXT[current];
      if (allowedNext !== next) {
        throw new BadRequestException({
          error: `Cannot change status from ${current} to ${next}`,
        });
      }

      await this.pool.query('UPDATE winning_records SET status = ? WHERE id = ?', [next, id]);
      return { message: 'Status updated' };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException) throw e;
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }
}
