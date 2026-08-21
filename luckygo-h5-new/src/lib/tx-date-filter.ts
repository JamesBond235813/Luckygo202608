import { ghanaCalendarDate, ghanaFilterDayStartMs, parseGhanaDateTime } from './ghana-datetime';
import type { Transaction } from '../types';

export type TxDatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

export type TxDateFilter = {
    preset: TxDatePreset;
    /** 内部 YYYY-MM-DD；展示为 DD/MM/YYYY */
    startDate?: string;
    endDate?: string;
};

export const defaultTxDateFilter = (): TxDateFilter => ({ preset: 'all' });

function dayStartMsFromTimestamp(timestamp: string): number | null {
    const parsed = parseGhanaDateTime(timestamp);
    if (!parsed) {
        const fallback = new Date(timestamp);
        if (Number.isNaN(fallback.getTime())) return null;
        return Date.UTC(
            fallback.getUTCFullYear(),
            fallback.getUTCMonth(),
            fallback.getUTCDate(),
            0,
            0,
            0,
        );
    }
    return Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate(),
        0,
        0,
        0,
    );
}

export function isTxDateFilterActive(filter: TxDateFilter): boolean {
    if (filter.preset === 'all') return false;
    if (filter.preset === 'custom') return Boolean(filter.startDate?.trim() || filter.endDate?.trim());
    return true;
}

export function matchesDateFilter(timestamp: string | undefined, filter: TxDateFilter): boolean {
    if (filter.preset === 'all') return true;

    const trimmed = timestamp?.trim() ?? '';
    if (!trimmed) return filter.preset !== 'custom';

    const txMs = dayStartMsFromTimestamp(trimmed);
    if (txMs === null) return filter.preset !== 'custom';

    const now = new Date();

    if (filter.preset === 'today') {
        return ghanaCalendarDate(new Date(txMs)) === ghanaCalendarDate(now);
    }
    if (filter.preset === 'week') {
        return (now.getTime() - txMs) / 86400000 <= 7;
    }
    if (filter.preset === 'month') {
        const txDate = new Date(txMs);
        return txDate.getUTCMonth() === now.getUTCMonth() && txDate.getUTCFullYear() === now.getUTCFullYear();
    }
    if (filter.preset === 'custom') {
        const startMs = filter.startDate ? ghanaFilterDayStartMs(filter.startDate) : null;
        const endMs = filter.endDate ? ghanaFilterDayStartMs(filter.endDate) : null;
        if (!startMs && !endMs) return true;
        if (startMs !== null && txMs < startMs) return false;
        if (endMs !== null && txMs > endMs + 86400000 - 1) return false;
        return true;
    }

    return true;
}

export function matchesTxDateFilter(tx: Transaction, filter: TxDateFilter): boolean {
    return matchesDateFilter(tx.timestamp, filter);
}
