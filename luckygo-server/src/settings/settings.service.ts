import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';

type SettingRow = RowDataPacket & {
  setting_key: string;
  value_json: unknown;
  description: string | null;
  is_public: number | boolean;
  updated_at: string;
};

@Injectable()
export class SettingsService {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  private parseValue(value: unknown): unknown {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  private mapRow(row: SettingRow) {
    return {
      key: row.setting_key,
      value: this.parseValue(row.value_json),
      description: row.description || '',
      isPublic: Boolean(row.is_public),
      updatedAt: row.updated_at,
    };
  }

  async getPublic() {
    try {
      const [rows] = await this.pool.query<SettingRow[]>(
        'SELECT setting_key, value_json, description, is_public, updated_at FROM app_settings WHERE is_public = TRUE ORDER BY setting_key',
      );
      return rows.map((row) => this.mapRow(row));
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async getAdmin() {
    try {
      const [rows] = await this.pool.query<SettingRow[]>(
        'SELECT setting_key, value_json, description, is_public, updated_at FROM app_settings ORDER BY setting_key',
      );
      return rows.map((row) => this.mapRow(row));
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async upsert(
    key: string,
    body: { value?: unknown; description?: string; isPublic?: boolean },
  ) {
    const { value, description, isPublic } = body;
    if (!key || value === undefined || value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException({ error: 'A JSON object value is required.' });
    }
    try {
      await this.pool.query(
        `INSERT INTO app_settings (setting_key, value_json, description, is_public)
         VALUES (?, CAST(? AS JSON), ?, ?)
         ON DUPLICATE KEY UPDATE value_json = CAST(? AS JSON), description = ?, is_public = ?`,
        [
          key,
          JSON.stringify(value),
          description || '',
          Boolean(isPublic),
          JSON.stringify(value),
          description || '',
          Boolean(isPublic),
        ],
      );
      return { message: 'Setting saved', key };
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }
}
