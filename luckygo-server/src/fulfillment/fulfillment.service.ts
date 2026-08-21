import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';

const STATUSES = ['Processing', 'Shipped', 'Received'] as const;

@Injectable()
export class FulfillmentService {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async submit(userId: number, id: number, body: { type?: string; name?: string; phone?: string; address?: string; note?: string }) {
    const type = String(body.type ?? '').trim().toLowerCase();
    if (!['pickup', 'delivery'].includes(type)) throw new BadRequestException({ error: 'Choose pickup or delivery' });
    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const address = String(body.address ?? '').trim();
    if (!name || !phone) throw new BadRequestException({ error: 'Name and phone are required' });
    if (type === 'delivery' && address.length < 8) throw new BadRequestException({ error: 'Delivery address is required' });
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT id, status, fulfillment_type FROM winning_records WHERE id = ? AND user_id = ? LIMIT 1',
      [id, userId],
    );
    if (!rows.length) throw new NotFoundException({ error: 'Winning record not found' });
    if (String(rows[0].status) === 'Received') throw new BadRequestException({ error: 'Winning record already completed' });
    await this.pool.query(
      `UPDATE winning_records SET fulfillment_type = ?, delivery_name = ?, delivery_phone = ?, delivery_address = ?, fulfillment_note = ?
       WHERE id = ? AND user_id = ?`,
      [type, name, phone, type === 'delivery' ? address : null, body.note?.trim() || null, id, userId],
    );
    return { message: 'Fulfillment preference saved', type };
  }

  async updateByAdmin(id: number, nextStatus?: string, note?: string) {
    const status = String(nextStatus ?? '').trim();
    if (!(STATUSES as readonly string[]).includes(status)) throw new BadRequestException({ error: 'Invalid fulfillment status' });
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT id, user_id, status, fulfillment_type FROM winning_records WHERE id = ? FOR UPDATE',
        [id],
      );
      if (!rows.length) throw new NotFoundException({ error: 'Winning record not found' });
      const type = String(rows[0].fulfillment_type || 'pickup');
      if (status === 'Shipped' && type !== 'delivery') throw new BadRequestException({ error: 'Pickup records cannot be shipped' });
      if (status === 'Received' && String(rows[0].status) === 'Processing' && type === 'delivery') {
        throw new BadRequestException({ error: 'Delivery must be marked shipped first' });
      }
      await connection.query(
        `UPDATE winning_records SET status = ?, fulfillment_note = COALESCE(?, fulfillment_note), claimed_at = IF(? = 'Received', NOW(), claimed_at)
         WHERE id = ?`,
        [status, note?.trim() || null, status, id],
      );
      await connection.commit();
      return { message: 'Fulfillment status updated', status };
    } catch (error) {
      await connection.rollback();
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({ error: 'Database error' });
    } finally {
      connection.release();
    }
  }
}
