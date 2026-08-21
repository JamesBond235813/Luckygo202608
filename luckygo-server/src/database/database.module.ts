import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import mysql from 'mysql2/promise';
import { MYSQL_POOL } from './database.constants';
import { DatabaseService } from './database.service';

/**
 * 全局数据库模块：提供连接池，并在启动时做一次连通性检查（与旧 backend 行为一致）。
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MYSQL_POOL,
      useFactory: (config: ConfigService) => {
        const useSsl = config.get<string>('DB_SSL', 'false') === 'true';
        return mysql.createPool({
          host: config.get<string>('DB_HOST', '127.0.0.1'),
          port: Number(config.get<string>('DB_PORT') ?? 3306),
          user: config.get<string>('DB_USER', 'luckygo'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME', 'luckygo'),
          /** 与 MySQL/RDS 会话时区一致，避免 sellout_at 解析差 8 小时导致倒计时异常 */
          timezone: config.get<string>('DB_TIMEZONE', '+08:00'),
          waitForConnections: true,
          connectionLimit: Number(config.get<string>('DB_CONNECTION_LIMIT') ?? 10),
          queueLimit: 0,
          ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
        });
      },
      inject: [ConfigService],
    },
    DatabaseService,
  ],
  exports: [MYSQL_POOL],
})
export class DatabaseModule {}
