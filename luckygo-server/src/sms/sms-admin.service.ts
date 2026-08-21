import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';

@Injectable()
export class SmsAdminService {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async listSendLogs(limit = 100): Promise<RowDataPacket[]> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit) || 100, 1), 500);
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        `SELECT * FROM sms_send_logs ORDER BY id DESC LIMIT ?`,
        [safeLimit],
      );
      return rows;
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }
}
