import { Inject, Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';
import {
  BASIC_CONFIG_SETTING_KEY,
  DEFAULT_BASIC_CONFIG,
  type BasicConfig,
} from './basic-config.constants';

type SettingRow = RowDataPacket & { value_json: unknown };

const MODAL_PLACEMENTS = new Set<BasicConfig['modalPlacement']>([
  'center-above',
  'center',
  'bottom',
]);

function str(value: unknown, fallback: string, maxLen: number): string {
  const s = String(value ?? '').trim();
  if (!s) return fallback;
  return s.slice(0, maxLen);
}

/** 可选字符串：空则保持空，不回落默认值（用于客服联系方式） */
function optionalStr(value: unknown, maxLen: number): string {
  if (value == null) return '';
  return String(value).trim().slice(0, maxLen);
}

function minAge(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(120, Math.round(n));
}

function normalizeLanguages(raw: unknown): BasicConfig['enabledLanguages'] {
  if (!Array.isArray(raw)) return [...DEFAULT_BASIC_CONFIG.enabledLanguages];
  const out: BasicConfig['enabledLanguages'] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const code = str(row.code, '', 16);
    if (!code) continue;
    out.push({
      code,
      label: str(row.label, code, 64),
      nativeName: str(row.nativeName, code, 64),
      enabled: row.enabled !== false,
    });
  }
  return out.length ? out : [...DEFAULT_BASIC_CONFIG.enabledLanguages];
}

export function normalizeBasicConfig(raw: unknown): BasicConfig {
  const src =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const modal = str(src.modalPlacement, DEFAULT_BASIC_CONFIG.modalPlacement, 32);
  return {
    appName: str(src.appName, DEFAULT_BASIC_CONFIG.appName, 64),
    currencyCode: str(src.currencyCode, DEFAULT_BASIC_CONFIG.currencyCode, 8).toUpperCase(),
    currencySymbol: str(src.currencySymbol, DEFAULT_BASIC_CONFIG.currencySymbol, 16),
    defaultLanguage: str(src.defaultLanguage, DEFAULT_BASIC_CONFIG.defaultLanguage, 16),
    modalPlacement: MODAL_PLACEMENTS.has(modal as BasicConfig['modalPlacement'])
      ? (modal as BasicConfig['modalPlacement'])
      : DEFAULT_BASIC_CONFIG.modalPlacement,
    darkModeDefault: Boolean(src.darkModeDefault),
    assistantEnabled: src.assistantEnabled !== false,
    enabledLanguages: normalizeLanguages(src.enabledLanguages),
    supportPhone: optionalStr(src.supportPhone ?? src.support_phone, 32),
    supportEmail: optionalStr(src.supportEmail ?? src.support_email, 128),
    supportWhatsapp: optionalStr(src.supportWhatsapp ?? src.support_whatsapp, 32),
    minAge: minAge(src.minAge ?? src.min_age, DEFAULT_BASIC_CONFIG.minAge),
    homeNoticeText: optionalStr(src.homeNoticeText ?? src.home_notice_text, 1024),
  };
}

@Injectable()
export class BasicConfigService {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async getConfig(): Promise<BasicConfig> {
    try {
      const [rows] = await this.pool.query<SettingRow[]>(
        'SELECT value_json FROM app_settings WHERE setting_key = ? LIMIT 1',
        [BASIC_CONFIG_SETTING_KEY],
      );
      if (!rows.length) return { ...DEFAULT_BASIC_CONFIG };
      return normalizeBasicConfig(rows[0]?.value_json);
    } catch {
      return { ...DEFAULT_BASIC_CONFIG };
    }
  }
}
