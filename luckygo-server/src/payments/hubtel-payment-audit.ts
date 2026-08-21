import type { Logger } from '@nestjs/common';
import { DailyFileLogger } from '../common/logging/daily-file-logger';
import { formatLogTimestampIfIso } from '../common/utils/log-datetime';

/** 入账触发来源（日志里搜 source= 即可区分） */
export type HubtelPaymentSource = 'callback' | 'confirm' | 'refund-callback';

export type HubtelPaymentAuditEvent = 'RECEIVED' | 'SETTLE' | 'SUCCESS' | 'SKIP' | 'FAIL';

const HUBTEL_PAYMENT_LOG_SEPARATOR = '-'.repeat(72);
const hubtelPaymentFileLog = new DailyFileLogger('hubtel-payment-callback');

const LOG_DATETIME_FIELD = /^(.*At|.*Time)$/i;

function shouldStartTaskSeparator(
  event: HubtelPaymentAuditEvent,
  _fields: Record<string, string | number | boolean | null | undefined>,
): boolean {
  return event === 'RECEIVED';
}

function shouldEndTaskSeparator(
  event: HubtelPaymentAuditEvent,
  fields: Record<string, string | number | boolean | null | undefined>,
): boolean {
  if (event === 'SUCCESS' || event === 'FAIL') return true;
  if (event !== 'SKIP') return false;
  const reason = String(fields.reason ?? '');
  return reason !== 'pending-payment' && reason !== 'hubtel-2001-reserved';
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
  process.stdout.write(`${HUBTEL_PAYMENT_LOG_SEPARATOR}\n`);
  hubtelPaymentFileLog.appendRaw(HUBTEL_PAYMENT_LOG_SEPARATOR);
}

/** 写入 PM2/控制台 + logs/hubtel-payment-callback/{YYYY-MM-DD}.log */
function appendHubtelPaymentLogLine(
  logger: Logger,
  event: HubtelPaymentAuditEvent,
  line: string,
): void {
  if (event === 'FAIL') {
    logger.error(line);
  } else if (event === 'SKIP') {
    logger.warn(line);
  } else {
    logger.log(line);
  }
  hubtelPaymentFileLog.append(line);
}

export function auditHubtelPayment(
  logger: Logger,
  event: HubtelPaymentAuditEvent,
  fields: Record<string, string | number | boolean | null | undefined>,
): void {
  if (shouldStartTaskSeparator(event, fields)) {
    writeSeparator();
  }

  const line = `[HubtelPay] ${event} ${formatFields(fields)}`;
  appendHubtelPaymentLogLine(logger, event, line);

  if (shouldEndTaskSeparator(event, fields)) {
    writeSeparator();
  }
}
