import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';
import { insertBeanLedger } from '../users/transaction-ledger.util';

type TaskRow = RowDataPacket & {
  id: number;
  code: string;
  title_zh: string;
  title_en: string;
  description_zh: string;
  description_en: string;
  task_type: string;
  target_value: number;
  reward_beans: number;
  enabled: number;
  sort_order: number;
};

@Injectable()
export class RewardsService {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async getSummary(userId: number) {
    try {
      const [userRows] = await this.pool.query<RowDataPacket[]>(
        'SELECT beans, nickname, avatar FROM users WHERE id = ? LIMIT 1',
        [userId],
      );
      if (!userRows.length) throw new NotFoundException({ error: 'User not found' });
      const [checkinRows] = await this.pool.query<RowDataPacket[]>(
        `SELECT checkin_date, streak_days, reward_beans
         FROM user_checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 1`,
        [userId],
      );
      const [todayRows] = await this.pool.query<RowDataPacket[]>(
        `SELECT id FROM user_checkins WHERE user_id = ? AND checkin_date = CURRENT_DATE() LIMIT 1`,
        [userId],
      );
      const [tasks] = await this.pool.query<TaskRow[]>(
        `SELECT * FROM bean_tasks WHERE enabled = 1 ORDER BY sort_order ASC, id ASC`,
      );
      const taskPayload = await Promise.all(tasks.map((task) => this.mapTask(userId, task)));
      return {
        beans: Number(userRows[0].beans ?? 0),
        checkin: {
          checkedInToday: todayRows.length > 0,
          streakDays: Number(checkinRows[0]?.streak_days ?? 0),
          lastDate: checkinRows[0]?.checkin_date ?? null,
          lastRewardBeans: Number(checkinRows[0]?.reward_beans ?? 0),
        },
        tasks: taskPayload,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async checkin(userId: number) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [settings] = await connection.query<RowDataPacket[]>(
        'SELECT value_json FROM app_settings WHERE setting_key = ? LIMIT 1',
        ['checkin.rewards'],
      );
      const cfg = this.normalizeCheckinConfig(settings[0]?.value_json);
      if (!cfg.enabled || cfg.dailyBeans <= 0) {
        throw new BadRequestException({ error: 'Check-in rewards are disabled' });
      }
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM user_checkins WHERE user_id = ? AND checkin_date = CURRENT_DATE() LIMIT 1',
        [userId],
      );
      if (existing.length) throw new ConflictException({ error: 'Already checked in today' });
      const [previous] = await connection.query<RowDataPacket[]>(
        `SELECT checkin_date, streak_days FROM user_checkins
         WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 1`,
        [userId],
      );
      const previousDate = previous[0]?.checkin_date ? String(previous[0].checkin_date).slice(0, 10) : '';
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
      const streakDays = previousDate === yesterday ? Number(previous[0].streak_days ?? 0) + 1 : 1;
      const streakBonus = cfg.streakBonusEnabled && streakDays % cfg.streakDays === 0 ? cfg.streakBonusBeans : 0;
      const rewardBeans = cfg.dailyBeans + streakBonus;
      await connection.query(
        `INSERT INTO user_checkins (user_id, checkin_date, streak_days, reward_beans)
         VALUES (?, CURRENT_DATE(), ?, ?)`,
        [userId, streakDays, rewardBeans],
      );
      await connection.query('UPDATE users SET beans = beans + ? WHERE id = ?', [rewardBeans, userId]);
      await insertBeanLedger(connection, userId, rewardBeans, 'Reward', streakBonus ? 'checkin_streak' : 'checkin_daily');
      await connection.commit();
      return { message: 'Check-in completed', beans: rewardBeans, streakDays };
    } catch (error) {
      await connection.rollback();
      if (error instanceof BadRequestException || error instanceof ConflictException) throw error;
      throw new InternalServerErrorException({ error: 'Database error' });
    } finally {
      connection.release();
    }
  }

  async claimTask(userId: number, code: string) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [taskRows] = await connection.query<TaskRow[]>(
        'SELECT * FROM bean_tasks WHERE code = ? AND enabled = 1 LIMIT 1 FOR UPDATE',
        [code.trim()],
      );
      if (!taskRows.length) throw new NotFoundException({ error: 'Task not found' });
      const task = taskRows[0];
      const [claimed] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM user_task_claims WHERE user_id = ? AND task_id = ? LIMIT 1',
        [userId, task.id],
      );
      if (claimed.length) throw new ConflictException({ error: 'Task already claimed' });
      const progress = await this.taskProgress(connection, userId, task);
      if (progress < Number(task.target_value)) {
        throw new BadRequestException({ error: 'Task is not completed' });
      }
      await connection.query(
        `INSERT INTO user_task_claims (user_id, task_id, progress, reward_beans)
         VALUES (?, ?, ?, ?)`,
        [userId, task.id, progress, task.reward_beans],
      );
      await connection.query('UPDATE users SET beans = beans + ? WHERE id = ?', [task.reward_beans, userId]);
      await insertBeanLedger(connection, userId, Number(task.reward_beans), 'Reward', `task_${task.code}`);
      await connection.commit();
      return { message: 'Task reward claimed', task: task.code, beans: Number(task.reward_beans) };
    } catch (error) {
      await connection.rollback();
      if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({ error: 'Database error' });
    } finally {
      connection.release();
    }
  }

  private async mapTask(userId: number, task: TaskRow) {
    const [claimRows] = await this.pool.query<RowDataPacket[]>(
      'SELECT progress, reward_beans, claimed_at FROM user_task_claims WHERE user_id = ? AND task_id = ? LIMIT 1',
      [userId, task.id],
    );
    const progress = await this.taskProgress(this.pool, userId, task);
    return {
      code: task.code,
      titleZh: task.title_zh,
      titleEn: task.title_en,
      descriptionZh: task.description_zh,
      descriptionEn: task.description_en,
      taskType: task.task_type,
      targetValue: Number(task.target_value),
      progress,
      rewardBeans: Number(task.reward_beans),
      claimed: claimRows.length > 0,
      claimedAt: claimRows[0]?.claimed_at ?? null,
    };
  }

  private async taskProgress(db: Pool | PoolConnection, userId: number, task: TaskRow): Promise<number> {
    if (task.code === 'first_recharge') {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS count FROM transactions WHERE user_id = ? AND type = 'Recharge' AND status = 'Success'`,
        [userId],
      );
      return Number(rows[0]?.count ?? 0);
    }
    if (task.code === 'first_order') {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS count FROM transactions WHERE user_id = ? AND type = 'Spend' AND status = 'Success'`,
        [userId],
      );
      return Number(rows[0]?.count ?? 0);
    }
    if (task.code === 'complete_profile') {
      const [rows] = await db.query<RowDataPacket[]>(
        'SELECT nickname, avatar FROM users WHERE id = ? LIMIT 1',
        [userId],
      );
      return rows[0]?.nickname && rows[0]?.avatar ? 1 : 0;
    }
    return 0;
  }

  private normalizeCheckinConfig(raw: unknown) {
    let value = raw;
    if (typeof value === 'string') {
      try { value = JSON.parse(value); } catch { value = {}; }
    }
    const obj = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return {
      enabled: obj.enabled !== false,
      dailyBeans: Math.max(0, Number(obj.dailyBeans ?? 50)),
      streakBonusEnabled: obj.streakBonusEnabled !== false,
      streakDays: Math.max(1, Number(obj.streakDays ?? 7)),
      streakBonusBeans: Math.max(0, Number(obj.streakBonusBeans ?? 100)),
    };
  }
}
