import { Inject, Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';
import {
  CHECKIN_DEFAULT_DAILY_BEANS,
  CHECKIN_DEFAULT_STREAK_BONUS_BEANS,
  CHECKIN_DEFAULT_STREAK_DAYS,
} from './checkin-reward.constants';

export const CHECKIN_REWARDS_SETTING_KEY = 'checkin.rewards';

export type CheckinRewardConfig = {
  enabled: boolean;
  dailyBeans: number;
  streakBonusEnabled: boolean;
  streakDays: number;
  streakBonusBeans: number;
};

export const DEFAULT_CHECKIN_REWARD_CONFIG: CheckinRewardConfig = {
  enabled: true,
  dailyBeans: CHECKIN_DEFAULT_DAILY_BEANS,
  streakBonusEnabled: true,
  streakDays: CHECKIN_DEFAULT_STREAK_DAYS,
  streakBonusBeans: CHECKIN_DEFAULT_STREAK_BONUS_BEANS,
};

type SettingRow = RowDataPacket & { value_json: unknown };

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeCheckinRewardConfig(raw: unknown): CheckinRewardConfig {
  const src =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    enabled: src.enabled !== false,
    dailyBeans: clampInt(src.dailyBeans, DEFAULT_CHECKIN_REWARD_CONFIG.dailyBeans, 0, 1_000_000),
    streakBonusEnabled: src.streakBonusEnabled !== false,
    streakDays: clampInt(src.streakDays, DEFAULT_CHECKIN_REWARD_CONFIG.streakDays, 1, 365),
    streakBonusBeans: clampInt(
      src.streakBonusBeans,
      DEFAULT_CHECKIN_REWARD_CONFIG.streakBonusBeans,
      0,
      1_000_000,
    ),
  };
}

/** 签到有礼配置（app_settings.checkin.rewards） */
@Injectable()
export class CheckinRewardConfigService {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async getConfig(): Promise<CheckinRewardConfig> {
    try {
      const [rows] = await this.pool.query<SettingRow[]>(
        'SELECT value_json FROM app_settings WHERE setting_key = ? LIMIT 1',
        [CHECKIN_REWARDS_SETTING_KEY],
      );
      if (!rows.length) return { ...DEFAULT_CHECKIN_REWARD_CONFIG };
      return normalizeCheckinRewardConfig(rows[0]?.value_json);
    } catch {
      return { ...DEFAULT_CHECKIN_REWARD_CONFIG };
    }
  }
}
