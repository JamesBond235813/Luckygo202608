import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from './database.constants';

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async onModuleInit(): Promise<void> {
    try {
      const connection = await this.pool.getConnection();
      connection.release();
      console.log('Successfully connected to the database.');
    } catch (error) {
      console.error('Database connection failed:', error);
    }
  }
}
