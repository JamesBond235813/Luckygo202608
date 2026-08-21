import { Inject, Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';
import {
  INVITE_SIGNUP_REWARD_INVITEE_BEANS,
  INVITE_SIGNUP_REWARD_INVITER_BEANS,
  INVITE_SPEND_BEANS_PER_UNIT,
  INVITE_SPEND_UNIT_GHS,
} from './invite-reward.constants';

export const INVITE_REWARDS_SETTING_KEY = 'invite.rewards';

export type InviteRewardConfig = {
  enabled: boolean;
  signupInviterBeans: number;
  signupInviteeBeans: number;
  spendUnitGhs: number;
  spendBeansPerUnit: number;
};

export const DEFAULT_INVITE_REWARD_CONFIG: InviteRewardConfig = {
  enabled: true,
  signupInviterBeans: INVITE_SIGNUP_REWARD_INVITER_BEANS,
  signupInviteeBeans: INVITE_SIGNUP_REWARD_INVITEE_BEANS,
  spendUnitGhs: INVITE_SPEND_UNIT_GHS,
  spendBeansPerUnit: INVITE_SPEND_BEANS_PER_UNIT,
};

type SettingRow = RowDataPacket & { value_json: unknown };

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeInviteRewardConfig(raw: unknown): InviteRewardConfig {
  const src =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    enabled: src.enabled !== false,
    signupInviterBeans: clampInt(
      src.signupInviterBeans,
      DEFAULT_INVITE_REWARD_CONFIG.signupInviterBeans,
      0,
      1_000_000,
    ),
    signupInviteeBeans: clampInt(
      src.signupInviteeBeans,
      DEFAULT_INVITE_REWARD_CONFIG.signupInviteeBeans,
      0,
      1_000_000,
    ),
    spendUnitGhs: clampInt(
      src.spendUnitGhs,
      DEFAULT_INVITE_REWARD_CONFIG.spendUnitGhs,
      1,
      1_000_000,
    ),
    spendBeansPerUnit: clampInt(
      src.spendBeansPerUnit,
      DEFAULT_INVITE_REWARD_CONFIG.spendBeansPerUnit,
      0,
      1_000_000,
    ),
  };
}

@Injectable()
export class InviteRewardConfigService {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async getConfig(): Promise<InviteRewardConfig> {
    try {
      const [rows] = await this.pool.query<SettingRow[]>(
        'SELECT value_json FROM app_settings WHERE setting_key = ? LIMIT 1',
        [INVITE_REWARDS_SETTING_KEY],
      );
      if (!rows.length) return { ...DEFAULT_INVITE_REWARD_CONFIG };
      return normalizeInviteRewardConfig(rows[0]?.value_json);
    } catch {
      return { ...DEFAULT_INVITE_REWARD_CONFIG };
    }
  }
}
