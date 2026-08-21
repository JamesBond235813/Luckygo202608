/** 与接口一致的加纳时间展示：DD/MM/YYYY HH:mm:ss */
export const GHANA_DATETIME_DISPLAY_REGEX = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;

/** 解析接口返回的加纳时间字符串（Africa/Accra = UTC+0） */
export function parseGhanaDateTime(value: string): Date | null {
    const trimmed = value.trim();
    const parts = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(trimmed);
    if (parts) {
        const [, day, month, year, hour, minute, second] = parts;
        const date = new Date(
            Date.UTC(+year, +month - 1, +day, +hour, +minute, +second),
        );
        return Number.isNaN(date.getTime()) ? null : date;
    }
    const fallback = new Date(trimmed);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/** 格式化为加纳时间字符串（本地操作反馈用） */
export function formatGhanaDateTime(input: Date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Accra',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(input);

    const pick = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((p) => p.type === type)?.value ?? '';

    return `${pick('day')}/${pick('month')}/${pick('year')} ${pick('hour')}:${pick('minute')}:${pick('second')}`;
}

/** 取加纳时区下的日期部分 DD/MM/YYYY，用于「今天/本周」筛选 */
export function ghanaCalendarDate(input: Date): string {
    return formatGhanaDateTime(input).split(' ')[0] ?? '';
}

/** 内部存储 YYYY-MM-DD → 展示 DD/MM/YYYY */
export function formatGhanaDateOnlyFromIso(isoYmd: string): string {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoYmd.trim());
    if (!parts) return isoYmd.trim();
    const [, year, month, day] = parts;
    return `${day}/${month}/${year}`;
}

/** 日历组件选中的 Date → 内部 YYYY-MM-DD（按加纳日历日） */
export function isoYmdFromPickerDate(input: Date): string {
    const [day, month, year] = ghanaCalendarDate(input).split('/');
    return `${year}-${month}-${day}`;
}

export function dateFromIsoYmd(isoYmd: string): Date | null {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoYmd.trim());
    if (!parts) return null;
    const [, year, month, day] = parts;
    return new Date(Date.UTC(+year, +month - 1, +day, 12, 0, 0));
}

/** 筛选边界：支持 YYYY-MM-DD 或 DD/MM/YYYY */
export function ghanaFilterDayStartMs(value: string): number | null {
    const trimmed = value.trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (iso) {
        const [, year, month, day] = iso;
        return Date.UTC(+year, +month - 1, +day, 0, 0, 0);
    }
    const ghana = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
    if (ghana) {
        const [, day, month, year] = ghana;
        return Date.UTC(+year, +month - 1, +day, 0, 0, 0);
    }
    return null;
}
