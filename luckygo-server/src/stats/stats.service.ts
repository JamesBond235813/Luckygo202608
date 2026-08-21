import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';

@Injectable()
export class StatsService {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async getDashboard(): Promise<Record<string, unknown>> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [totalUsersRes] = await this.pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM users',
      );
      const [newUsersTodayRes] = await this.pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = ?',
        [today],
      );
      const [totalTurnoverRes] = await this.pool.query<RowDataPacket[]>(
        'SELECT SUM(amount) as total FROM transactions WHERE type = "Spend"',
      );
      const [todayTurnoverRes] = await this.pool.query<RowDataPacket[]>(
        'SELECT SUM(amount) as total FROM transactions WHERE type = "Spend" AND DATE(created_at) = ?',
        [today],
      );
      const [totalOrdersRes] = await this.pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM checkouts',
      );
      const [todayOrdersRes] = await this.pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM checkouts WHERE DATE(created_at) = ?',
        [today],
      );
      const [totalRevenueRes] = await this.pool.query<RowDataPacket[]>(
        'SELECT SUM(amount) as total FROM transactions WHERE type = "Recharge"',
      );
      const [todayRevenueRes] = await this.pool.query<RowDataPacket[]>(
        'SELECT SUM(amount) as total FROM transactions WHERE type = "Recharge" AND DATE(created_at) = ?',
        [today],
      );
      const [dailySales] = await this.pool.query<RowDataPacket[]>(`
        SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, SUM(amount) as amount 
        FROM transactions 
        WHERE type = "Spend" AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);
      const [dailyUsers] = await this.pool.query<RowDataPacket[]>(`
        SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, COUNT(*) as count 
        FROM users 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);
      const [dailyOrders] = await this.pool.query<RowDataPacket[]>(`
        SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, COUNT(*) as count 
        FROM checkouts 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);

      return {
        stats: {
          totalUsers: totalUsersRes[0].count,
          newUsersToday: newUsersTodayRes[0].count,
          totalTurnover: totalTurnoverRes[0].total || 0,
          todayTurnover: todayTurnoverRes[0].total || 0,
          totalOrders: totalOrdersRes[0].count,
          todayOrders: todayOrdersRes[0].count,
          totalRevenue: totalRevenueRes[0].total || 0,
          todayRevenue: todayRevenueRes[0].total || 0,
        },
        trends: {
          sales: dailySales,
          users: dailyUsers,
          orders: dailyOrders,
        },
      };
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }
}
