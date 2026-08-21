/** 加纳展示格式：日/月/年 24 小时制，含时分秒（Africa/Accra, UTC+0） */
export const GHANA_DATETIME_DISPLAY_REGEX = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;

const ISO_DATETIME_REGEX =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const DATETIME_FIELD_REGEX =
  /(?:^|_)(?:at|time|timestamp)(?:$|_)|(?:At|Time|Timestamp)$|^date$|^drawTime$|^drawnAt$|^selloutAt$|^drawScheduledAt$/i;

function isDateLikeKey(key: string | undefined): boolean {
  if (!key) return false;
  return DATETIME_FIELD_REGEX.test(key);
}

function isDateLikeValue(value: unknown): boolean {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || GHANA_DATETIME_DISPLAY_REGEX.test(trimmed)) return false;
  return ISO_DATETIME_REGEX.test(trimmed) || DATE_ONLY_REGEX.test(trimmed);
}

export function formatGhanaDateTime(input: Date | string | number): string {
  if (typeof input === 'string' && GHANA_DATETIME_DISPLAY_REGEX.test(input.trim())) {
    return input.trim();
  }

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return typeof input === 'string' ? input : String(input);
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Accra',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  return `${pick('day')}/${pick('month')}/${pick('year')} ${pick('hour')}:${pick('minute')}:${pick('second')}`;
}

function formatIfDateValue(value: unknown, key?: string): unknown {
  if (value == null) return value;

  if (value instanceof Date) {
    return formatGhanaDateTime(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (GHANA_DATETIME_DISPLAY_REGEX.test(trimmed)) return trimmed;
    if (isDateLikeKey(key) || ISO_DATETIME_REGEX.test(trimmed) || DATE_ONLY_REGEX.test(trimmed)) {
      if (DATE_ONLY_REGEX.test(trimmed)) {
        return formatGhanaDateTime(`${trimmed}T00:00:00Z`);
      }
      return formatGhanaDateTime(trimmed);
    }
    return value;
  }

  return value;
}

const MAX_DEPTH = 32;

/** 递归格式化响应体中的日期时间字段 */
export function formatDatesInValue(value: unknown, key?: string, depth = 0): unknown {
  if (depth > MAX_DEPTH) return value;

  const formatted = formatIfDateValue(value, key);
  if (formatted !== value) return formatted;

  if (Array.isArray(value)) {
    return value.map((item) => formatDatesInValue(item, undefined, depth + 1));
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = formatDatesInValue(v, k, depth + 1);
    }
    return out;
  }

  return value;
}

export function shouldFormatDateField(key: string | undefined, value: unknown): boolean {
  return isDateLikeKey(key) || isDateLikeValue(value);
}
