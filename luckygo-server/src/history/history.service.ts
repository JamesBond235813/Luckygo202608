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
