import type { Logger } from '@nestjs/common';
import { DailyFileLogger } from '../../common/logging/daily-file-logger';
import { formatLogTimestampIfIso } from '../../common/utils/log-datetime';

/** 开奖触发来源（日志里搜 source= 即可区分） */
export type AutoDrawSource =
  | 'redis-queue'
  | 'schedule-redis'
  | 'recovery-cron'
  | 'recovery-startup'
  | 'manual-admin';

export type AutoDrawAuditEvent =
  | 'SCHEDULE'
  | 'TRIGGER'
  | 'SUCCESS'
  | 'SKIP'
  | 'FAIL'
  | 'BATCH';

const AUTO_DRAW_LOG_SEPARATOR = '-'.repeat(72);
const autoDrawFileLog = new DailyFileLogger('auto-draw');

const LOG_DATETIME_FIELD = /^(drawAt|drawnAt|selloutAt|.*At|.*Time)$/i;

function shouldStartTaskSeparator(
  event: AutoDrawAuditEvent,
  fields: Record<string, string | number | boolean | null | undefined>,
): boolean {
  if (event === 'SCHEDULE') return true;
  if (event !== 'TRIGGER') return false;
  const source = String(fields.source ?? '');
  return source === 'recovery-cron' || source === 'recovery-startup' || source === 'manual-admin';
}

function shouldEndTaskSeparator(
  event: AutoDrawAuditEvent,
  fields: Record<string, string | number | boolean | null | undefined>,
): boolean {
  if (event === 'SUCCESS' || event === 'FAIL') return true;
  if (event !== 'SKIP') return false;
  const reason = String(fields.reason ?? '');
  if (reason === 'lock-held-by-other-worker' || reason === 'not-due-yet') {
    return false;
  }
  return true;
}

function formatFieldValue(key: string, value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (LOG_DATETIME_FIELD.test(key)) {
    return formatLogTimestampIfIso(value);
  }
  return formatLogTimestampIfIso(value);
}

function formatFields(fields: Record<string, string | number | boolean | null | undefined>): string {
  return Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${formatFieldValue(k, v as string | number | boolean)}`)
    .join(' ');
}

function writeSeparator(): void {
  process.stdout.write(`${AUTO_DRAW_LOG_SEPARATOR}\n`);
  autoDrawFileLog.appendRaw(AUTO_DRAW_LOG_SEPARATOR);
}

/** 写入 PM2/控制台 + logs/auto-draw/{YYYY-MM-DD}.log */
function appendAutoDrawLogLine(logger: Logger, event: AutoDrawAuditEvent, line: string): void {
  if (event === 'FAIL') {
    logger.error(line);
  } else if (event === 'BATCH' || event === 'SKIP') {
    logger.warn(line);
  } else {
    logger.log(line);
  }
  autoDrawFileLog.append(line);
}

export function auditAutoDraw(
  logger: Logger,
  event: AutoDrawAuditEvent,
  fields: Record<string, string | number | boolean | null | undefined>,
): void {
  if (shouldStartTaskSeparator(event, fields)) {
    writeSeparator();
  }

  const line = `[AutoDraw] ${event} ${formatFields(fields)}`;
  appendAutoDrawLogLine(logger, event, line);

  if (shouldEndTaskSeparator(event, fields)) {
    writeSeparator();
  }
}
