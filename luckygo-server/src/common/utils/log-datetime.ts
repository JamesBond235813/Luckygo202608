/** 按 LOG_TZ 取当天日期键 YYYY-MM-DD（用于日志文件名） */
export function getLogDateKey(date: Date = new Date()): string {
  const timeZone = process.env.LOG_TZ || 'Africa/Accra';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** 运营/审计日志时间：YYYY-MM-DD HH:mm:ss.SSS，时区由 LOG_TZ 控制 */
export function formatLogTimestamp(date: Date = new Date()): string {
  const timeZone = process.env.LOG_TZ || 'Africa/Accra';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false,
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  const ms = pick('fractionalSecond') || '000';
  return `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}:${pick('second')}.${ms}`;
}

const ISO_PREFIX_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export function formatLogTimestampIfIso(value: string | number | boolean | null | undefined): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  const trimmed = value.trim();
  if (ISO_PREFIX_REGEX.test(trimmed)) {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return formatLogTimestamp(d);
  }
  return trimmed;
}
