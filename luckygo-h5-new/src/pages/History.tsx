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

type DateFilterKey = 'all' | 'today' | 'week' | 'month';

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
                        <span className="material-symbols-outlined text-gray-700 dark:text-slate-400">calendar_month</span>
                    </button>
                }
            />

            <PullToRefresh onRefresh={handleRefresh} className="flex-1">
                <main className="p-4 space-y-4" aria-busy={loading}>
                    {loading ? (
                        <HistoryListSkeleton />
                    ) : visibleRecords.map((record) => (
                        <details key={record.id} className="group bg-white dark:bg-dark-card rounded-2xl overflow-hidden shadow-sm border border-white dark:border-slate-800 transition-colors" open>
                            <summary className="cursor-pointer list-none select-none relative z-10 bg-inherit">
                                <div className="p-4 flex gap-4">
                                    <div className="shrink-0 relative">
                                        <img src={record.productImage} className="w-20 h-20 rounded-xl bg-gray-50 dark:bg-slate-800 object-cover border border-gray-100 dark:border-slate-700" alt="" />
                                        <div className="absolute -bottom-1.5 -right-1.5 bg-ghana-green text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-white dark:border-slate-900">
                                            {t('historyAwarded')}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                        <div>
                                            <div className="flex justify-between items-start gap-2">
                                                <h3 className="font-bold text-[15px] text-gray-900 dark:text-slate-100 leading-tight truncate">{record.productName}</h3>
                                                <span className="shrink-0 text-[10px] text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium">{tf(t, 'historyIssueLine', { issue: String(record.issue) })}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{tf(t, 'historyDrawLine', { time: record.drawTime || '' })}</p>
                                        </div>
                                        <div className="flex items-end justify-between mt-2">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 dark:text-slate-500 mb-0.5 font-medium">{t('historyLuckyNumber')}</span>
                                                <span className="text-ghana-green font-bold font-mono text-xl leading-none tracking-wide">{record.winningNumber}</span>
                                            </div>
                                            <div className="w-7 h-7 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center transition-transform duration-300 group-open:-rotate-180 border border-gray-100 dark:border-slate-700">
                                                <span className="material-symbols-outlined text-gray-400 dark:text-slate-500 text-lg">expand_more</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </summary>

                            <div className="overflow-hidden transition-all duration-300">
                                <div className="px-4 pb-5 pt-0">
                                    <div className="h-px bg-gray-100 dark:bg-slate-800 mb-4"></div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full p-[1.5px] bg-gradient-to-tr from-primary to-ghana-green">
                                                    <img src={record.winnerAvatar} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-900" alt="" />
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 bg-primary text-black text-[8px] font-bold px-1 rounded-sm shadow-sm">{t('historyWinBadge')}</div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500 dark:text-slate-500 font-medium">{t('historyWinnerLabel')}</p>
                                                <p className="text-sm font-bold text-gray-800 dark:text-slate-200">{record.winnerName}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-500 dark:text-slate-500 font-medium">{t('participationLabel')}</p>
                                            <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{formatProductNumber(record.totalShares)}</span>
                                        </div>
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
                                <span className="material-symbols-outlined text-xl">close</span>
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
