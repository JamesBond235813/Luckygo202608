import React, { useCallback, useState, useEffect } from 'react';
import { ApiService, getApiErrorMessage } from '../services/api';
import { logUnexpectedApiError } from '../lib/api-response';
import { showSimpleToast } from '../lib/simpleToast';
import PullToRefresh from '../components/PullToRefresh';
import type { HistoryRecord } from '../types';
import { formatProductNumber, tf } from '../lib/localization';
import { useI18n } from '../lib/useI18n';
import { AppPageNav } from '../components/AppPageNav';
import { HistoryListSkeleton } from '../components/history/HistorySkeleton';
import { ghanaCalendarDate, parseGhanaDateTime } from '../lib/ghana-datetime';
import { CalendarDays, ChevronDown, Trophy, UserRound, X } from 'lucide-react';

type DateFilterKey = 'all' | 'today' | 'week' | 'month';

const formatBetTime = (value: string) => {
    const trimmed = value.trim();
    const displayMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2}:\d{2})$/);
    if (displayMatch) return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]} ${displayMatch[4]}`;
    return trimmed.replace('T', ' ').replace(/\.\d{3}Z$/, '');
};

const History: React.FC = () => {
    const { t } = useI18n();
    const [records, setRecords] = useState<HistoryRecord[]>([]);
    const [dateFilter, setDateFilter] = useState<DateFilterKey>('all');
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const data = await ApiService.getHistory();
            setRecords(data);
        } catch (error) {
            logUnexpectedApiError(error);
            showSimpleToast(getApiErrorMessage(error, t('historyLoadFailed')));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void Promise.resolve().then(fetchData);
    }, [fetchData]);

    const handleRefresh = async () => {
        await fetchData();
    };

    const visibleRecords = records.filter((record) => {
        if (dateFilter === 'all') return true;

        const rawDate = record.drawTime ? parseGhanaDateTime(record.drawTime) : null;
        if (!rawDate) return true;

        const now = new Date();
        const diffDays = (now.getTime() - rawDate.getTime()) / 86400000;
        if (dateFilter === 'today') return ghanaCalendarDate(rawDate) === ghanaCalendarDate(now);
        if (dateFilter === 'week') return diffDays <= 7;
        if (dateFilter === 'month') return rawDate.getMonth() === now.getMonth() && rawDate.getFullYear() === now.getFullYear();
        return true;
    });

    return (
        <div className="bg-gray-100 dark:bg-dark-surface min-h-screen flex flex-col pb-24 transition-colors">
            <AppPageNav
                title={t('historyTitle')}
                left={null}
                className="border-b-gray-200 bg-white/80 dark:border-slate-800 dark:bg-dark-card/80 backdrop-blur-md"
                right={
                    <button
                        type="button"
                        onClick={() => setCalendarOpen(true)}
                        className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
                        aria-label={t('historyDateRange')}
                    >
                        <CalendarDays size={19} strokeWidth={2.1} aria-hidden="true" />
                    </button>
                }
            />

            <PullToRefresh onRefresh={handleRefresh} className="flex-1">
                <main className="p-4 space-y-4" aria-busy={loading}>
                    {loading ? (
                        <HistoryListSkeleton />
                    ) : visibleRecords.map((record) => (
                        <details key={record.id} className="group overflow-hidden rounded-[18px] border border-[#e5ebe7] bg-white shadow-[0_8px_24px_rgba(11,50,32,0.07)] transition-colors dark:border-slate-800 dark:bg-dark-card" open>
                            <summary className="cursor-pointer list-none select-none relative z-10 bg-inherit">
                                <div className="flex gap-3.5 p-4 pb-3">
                                    <div className="relative shrink-0">
                                        <div className="flex size-[76px] items-center justify-center overflow-hidden rounded-2xl border border-[#e5ebe7] bg-[#f5f8f6] dark:border-slate-700 dark:bg-slate-800">
                                            <img src={record.productImage} className="h-full w-full object-cover" alt="" />
                                        </div>
                                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ghana-green px-2 py-0.5 text-[9px] font-black text-white shadow-sm ring-2 ring-white dark:ring-dark-card">
                                            {t('historyAwarded')}
                                        </div>
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col">
                                        <div className="flex items-start gap-2">
                                            <h3 className="line-clamp-2 min-w-0 flex-1 text-[15px] font-extrabold leading-[1.25] text-gray-900 dark:text-slate-100">{record.productName}</h3>
                                            <ChevronDown size={16} strokeWidth={2.2} className="mt-0.5 shrink-0 text-gray-400 transition-transform duration-300 group-open:rotate-180 dark:text-slate-500" aria-hidden="true" />
                                        </div>
                                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] font-medium text-gray-500 dark:text-slate-400">
                                            <span>{tf(t, 'historyIssueLine', { issue: String(record.issue) })}</span>
                                            <span className="text-right">{record.drawTime || '-'}</span>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-ghana-green/10 bg-ghana-green/[0.06] px-3 py-2">
                                            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ghana-green/70">{t('historyLuckyNumber')}</span>
                                            <span className="font-mono text-[22px] font-black leading-none tracking-[0.1em] text-ghana-green">{record.winningNumber}</span>
                                        </div>
                                    </div>
                                </div>
                            </summary>

                            <div className="overflow-hidden transition-all duration-300">
                                <div className="px-4 pb-4 pt-0">
                                    <div className="mb-3 h-px bg-[#edf1ee] dark:bg-slate-800"></div>
                                    <div className="flex items-center justify-between rounded-xl bg-[#f6faf7] px-3 py-2.5 dark:bg-slate-800/60">
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <div className="relative shrink-0">
                                                <div className="size-9 overflow-hidden rounded-full bg-gradient-to-tr from-primary to-ghana-green p-[1.5px]">
                                                    <img src={record.winnerAvatar} className="h-full w-full rounded-full border-2 border-white object-cover dark:border-slate-900" alt="" />
                                                </div>
                                                <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] text-gray-900 shadow-sm"><Trophy size={9} strokeWidth={2.8} /></span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-500">{t('historyWinnerLabel')}</p>
                                                <p className="truncate text-sm font-extrabold text-gray-800 dark:text-slate-200">{record.winnerName}</p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5 text-right">
                                            <UserRound size={15} className="text-ghana-green/70" aria-hidden="true" />
                                            <div>
                                                <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-500">{t('participationLabel')}</p>
                                                <span className="text-sm font-extrabold text-gray-800 dark:text-slate-200">{formatProductNumber(record.totalShares)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 overflow-hidden rounded-xl border border-[#e5ebe7] dark:border-slate-700">
                                        <div className="border-b border-[#e5ebe7] bg-[#f8faf9] px-3 py-2 text-xs font-extrabold text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                            {t('historyEntriesTitle')}
                                        </div>
                                        {record.entries.length ? (
                                            <>
                                                <div className="grid grid-cols-[0.9fr_1.5fr_auto] gap-2 bg-white px-3 py-2 text-[10px] font-semibold text-gray-400 dark:bg-dark-card dark:text-slate-500">
                                                    <span>{t('historyEntriesPhone')}</span>
                                                    <span>{t('historyEntriesTime')}</span>
                                                    <span className="text-right">{t('historyEntriesShares')}</span>
                                                </div>
                                                <div className="divide-y divide-[#edf1ee] dark:divide-slate-800">
                                                    {record.entries.map((entry, index) => (
                                                        <div key={`${entry.phone}-${entry.betTime}-${index}`} className="grid grid-cols-[0.9fr_1.5fr_auto] gap-2 bg-white px-3 py-2 text-[11px] text-gray-600 dark:bg-dark-card dark:text-slate-300">
                                                            <span className="font-semibold tabular-nums">{entry.phone}</span>
                                                            <span className="tabular-nums">{formatBetTime(entry.betTime)}</span>
                                                            <span className="text-right font-bold tabular-nums text-ghana-green">{entry.shares}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            <p className="bg-white px-3 py-3 text-xs text-gray-400 dark:bg-dark-card dark:text-slate-500">{t('historyEntriesEmpty')}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </details>
                    ))}

                    {!loading && (
                        <div className="py-6 text-center">
                            <span className="text-xs text-gray-400 dark:text-slate-600 font-medium">{t('historyFooterTagline')}</span>
                        </div>
                    )}
                </main>
            </PullToRefresh>
            {calendarOpen && (
                <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-4 pb-24">
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black">{t('historyDateRange')}</h3>
                            <button type="button" onClick={() => setCalendarOpen(false)} className="size-9 rounded-full bg-gray-100">
                                <X size={18} strokeWidth={2.2} aria-hidden="true" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {(
                                [
                                    { key: 'all' as const, labelKey: 'historyFilterAllTime' },
                                    { key: 'today' as const, labelKey: 'historyFilterToday' },
                                    { key: 'week' as const, labelKey: 'historyFilterThisWeek' },
                                    { key: 'month' as const, labelKey: 'historyFilterThisMonth' },
                                ] as const
                            ).map((item) => (
                                <button
                                    type="button"
                                    key={item.key}
                                    onClick={() => setDateFilter(item.key)}
                                    className={`rounded-xl py-2 text-sm font-bold ${dateFilter === item.key ? 'bg-ghana-green text-white' : 'bg-gray-100 text-gray-700'}`}
                                >
                                    {t(item.labelKey)}
                                </button>
                            ))}
                        </div>
                        <button type="button" onClick={() => setCalendarOpen(false)} className="mt-4 w-full rounded-xl bg-ghana-green py-3 text-white font-black">
                            {t('commonApply')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default History;
