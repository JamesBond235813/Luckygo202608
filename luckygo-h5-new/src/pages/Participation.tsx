import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateRangeFilterSheet } from '../components/DateRangeFilterSheet';
import { ApiService, getApiErrorMessage } from '../services/api';
import { showSimpleToast } from '../lib/simpleToast';
import type { WinningRecord } from '../types';
import { tfProduct } from '../lib/localization';
import { useI18n } from '../lib/useI18n';
import { formatCampaignRoundNo } from '../lib/campaign-round';
import {
    defaultTxDateFilter,
    isTxDateFilterActive,
    matchesDateFilter,
    type TxDateFilter,
} from '../lib/tx-date-filter';
import { AppPageNav } from '../components/AppPageNav';
import { resolveAssetUrl } from '../lib/asset-url';
import { DrawCountdownBanner } from '../components/DrawCountdownBanner';
import { isH5Authenticated } from '../lib/auth';
import { AuthEmptyState } from '../components/AuthEmptyState';
import { ParticipationListSkeleton } from '../components/participation/ParticipationSkeleton';

const participationStatusLabel = (status: string, tr: (key: string) => string) => {
    const map: Record<string, string> = {
        Ongoing: 'partStatusOngoing',
        Awaiting: 'partStatusAwaiting',
        Announced: 'partStatusAnnounced',
        Won: 'partStatusWon',
    };
    const key = map[status];
    return key ? tr(key) : status;
};

const Participation: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState('All');
    const [records, setRecords] = useState<ParticipationItem[]>([]);
    const [selected, setSelected] = useState<ParticipationItem | null>(null);
    const [dateFilterOpen, setDateFilterOpen] = useState(false);
    const [dateFilter, setDateFilter] = useState<TxDateFilter>(defaultTxDateFilter);
    const [loading, setLoading] = useState(() => isH5Authenticated());

    const dateFilterActive = isTxDateFilterActive(dateFilter);
    const isLoggedIn = isH5Authenticated();

    const load = useCallback(async () => {
        if (!isH5Authenticated()) return;
        try {
            const [rawParticipation, winnings] = await Promise.all([
                ApiService.getUserParticipation(),
                ApiService.getUserWinnings(),
            ]);
            const winningsByCampaign = new Map<string, WinningRecord>();
            (winnings as WinningRecord[]).forEach((w) => {
                const key = String(w.campaignId || '');
                if (key) winningsByCampaign.set(key, w);
            });
            const mapped = (rawParticipation as ApiParticipation[]).map((item) => {
                const campaignId = Number(item.campaign_id || item.id);
                const productId = Number(item.product_id);
                const derived = deriveParticipationStatus(item);
                const winRecord = winningsByCampaign.get(String(campaignId));
                const userWon = Boolean(item.user_won) || Boolean(winRecord);
                const displayStatus = userWon ? 'Won' : derived;
                const roundNo = Number(item.round_no || 0);
                const winningNumber = String(
                    item.winning_number || winRecord?.winningNumber || '',
                ).trim() || null;
                const drawPending = Boolean(item.draw_pending ?? item.drawPending);
                const drawCountdownRemaining =
                    Number(item.draw_countdown_remaining ?? item.drawCountdownRemaining) || 0;
                return {
                    id: String(campaignId),
                    productId,
                    campaignId,
                    title: formatParticipationTitle(
                        item.product_title || t('participationFallbackProduct'),
                        roundNo,
                    ),
                    image: item.product_image || '',
                    shares: Number(item.shares ?? item.count ?? 0),
                    totalShares: Number(item.total_shares || 1),
                    sharesSold: Number(item.shares_sold || 0),
                    status: displayStatus,
                    numbers: parseNumbers(item.numbers),
                    winningNumber,
                    userWon,
                    drawPending,
                    drawCountdownRemaining,
                    participatedAt: String(
                        item.last_participated_at ?? item.lastParticipatedAt ?? '',
                    ).trim(),
                };
            });
            setRecords(mapped);
        } catch (e) {
            setRecords([]);
            showSimpleToast(getApiErrorMessage(e, t('participationLoadFailed')));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (!isLoggedIn) {
            setLoading(false);
            return;
        }
        setLoading(true);
        void load();
    }, [load, isLoggedIn]);

    const visibleRecords = useMemo(() => {
        return records.filter((item) => {
            if (!matchesDateFilter(item.participatedAt, dateFilter)) return false;
            if (activeTab === 'All') return true;
            if (activeTab === 'Ongoing') return item.status === 'Ongoing' || item.status === 'Awaiting';
            if (activeTab === 'Announced') return item.status === 'Announced';
            if (activeTab === 'Won') return item.status === 'Won';
            return false;
        });
    }, [records, activeTab, dateFilter]);

    const emptyByFilter = records.length > 0 && visibleRecords.length === 0;

    return (
        <div className="bg-gray-50 dark:bg-dark-surface min-h-screen flex flex-col pb-24 transition-colors">
            <AppPageNav
                title={t('participationTitle')}
                onBack={() => navigate('/me')}
                right={
                    <button
                        type="button"
                        onClick={() => setDateFilterOpen(true)}
                        className="relative flex size-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
                        aria-label={t('participationDateRange')}
                    >
                        <span
                            className={`material-symbols-outlined text-[24px] ${
                                dateFilterActive
                                    ? 'text-ghana-green dark:text-primary'
                                    : 'text-gray-700 dark:text-slate-400'
                            }`}
                        >
                            calendar_month
                        </span>
                        {dateFilterActive ? (
                            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-ghana-green ring-2 ring-white dark:ring-dark-card" />
                        ) : null}
                    </button>
                }
            />

            <div className="bg-white dark:bg-dark-card px-4 border-b border-gray-100 dark:border-slate-800 transition-colors">
                <div className="flex justify-between gap-2">
                    {(['All', 'Ongoing', 'Announced', 'Won'] as const).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className="relative flex flex-col items-center justify-center pb-3 pt-2 flex-1 cursor-pointer"
                        >
                            <p
                                className={`text-sm ${activeTab === tab ? 'text-gray-900 dark:text-slate-100 font-bold' : 'text-gray-400 dark:text-slate-500 font-medium'}`}
                            >
                                {tab === 'All'
                                    ? t('participationTabAll')
                                    : tab === 'Ongoing'
                                      ? t('participationTabOngoing')
                                      : tab === 'Announced'
                                        ? t('participationTabAnnounced')
                                        : t('participationTabWon')}
                            </p>
                            {activeTab === tab && <div className="absolute bottom-0 h-[3px] w-8 bg-primary rounded-full" />}
                        </button>
                    ))}
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-4 space-y-4" aria-busy={loading}>
                {!isLoggedIn ? (
                    <AuthEmptyState from="/participation" />
                ) : loading && records.length === 0 ? (
                    <ParticipationListSkeleton />
                ) : visibleRecords.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 dark:text-slate-500 py-12">
                        {emptyByFilter ? t('participationEmptyFiltered') : t('participationEmpty')}
                    </p>
                ) : null}
                {isLoggedIn && !loading && visibleRecords.map((product) => {
                    const isWon = product.status === 'Won';
                    const isAwaiting = product.status === 'Awaiting';
                    const badgeLabel = isWon
                        ? t('participationBadgeWon')
                        : product.status === 'Ongoing'
                          ? t('participationBadgeOngoing')
                          : isAwaiting
                            ? t('partStatusAwaiting')
                            : t('participationBadgeSoon');
                    const badgeClass = isWon
                        ? 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400'
                        : isAwaiting
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                          : 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400';
                    return (
                        <div
                            key={product.id}
                            role="presentation"
                            onClick={() => setSelected(product)}
                            className="flex flex-col gap-3 rounded-2xl bg-white dark:bg-dark-card p-4 shadow-sm border border-gray-100 dark:border-slate-800 transition-all active:scale-[0.99]"
                        >
                            <div className="flex gap-4">
                                <img
                                    src={resolveAssetUrl(product.image)}
                                    className="w-24 h-24 shrink-0 rounded-xl bg-gray-50 dark:bg-slate-800 object-cover border border-gray-100 dark:border-slate-700"
                                    alt={product.title}
                                />
                                <div className="flex flex-col flex-1 justify-between py-0.5">
                                    <div>
                                        <h3 className="text-gray-900 dark:text-slate-100 text-sm font-bold leading-tight line-clamp-2 mb-2">{product.title}</h3>
                                        <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 mb-2 ${badgeClass}`}>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{badgeLabel}</span>
                                        </div>
                                    </div>
                                    <div
                                        className={`grid gap-y-0.5 min-w-0 ${product.winningNumber ? 'grid-cols-2' : 'grid-cols-1'}`}
                                    >
                                        <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">
                                            {t('participationLabel')}
                                        </span>
                                        {product.winningNumber ? (
                                            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium text-right">
                                                {product.userWon ? t('participationYourWinningNumber') : t('participationWinningNumber')}
                                            </span>
                                        ) : null}
                                        <span className="text-ghana-green text-sm font-bold">
                                            {tfProduct(t, 'participationSharesLine', { n: product.shares })}
                                        </span>
                                        {product.winningNumber ? (
                                            <span
                                                className={`font-mono text-sm font-bold tracking-wide text-right truncate ${
                                                    product.userWon ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-800 dark:text-slate-200'
                                                }`}
                                            >
                                                {product.winningNumber}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                            {isAwaiting && product.drawPending ? (
                                <DrawCountdownBanner
                                    remainingSeconds={product.drawCountdownRemaining}
                                    enabled
                                    compact
                                    onExpire={() => void load()}
                                />
                            ) : null}
                            <div className="pt-3 mt-1 border-t border-gray-50 dark:border-slate-800 flex justify-between items-center transition-colors">
                                <div className="text-xs text-gray-500 dark:text-slate-500">
                                    {t('participationProgress')}{' '}
                                    <span className="text-gray-900 dark:text-slate-300 font-bold">
                                        {Math.round((product.sharesSold / Math.max(product.totalShares, 1)) * 100)}%
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        navigate(`/product-details/${product.campaignId}`);
                                    }}
                                    className="flex items-center justify-center rounded-lg h-8 px-5 bg-primary text-ghana-green text-xs font-bold transition-transform active:scale-95 shadow-sm"
                                >
                                    {product.status === 'Ongoing' ? t('participationBuyAgain') : t('participationViewCampaign')}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </main>
            {selected && (
                <div
                    className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 p-4 pb-24"
                    onClick={() => setSelected(null)}
                    role="presentation"
                >
                    <div
                        className="flex w-full max-w-md max-h-[min(82vh,calc(100dvh-7rem))] flex-col rounded-2xl bg-white dark:bg-dark-card shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="shrink-0 flex items-center justify-between border-b border-gray-100 dark:border-slate-800 px-5 py-4">
                            <h3 className="text-lg font-black pr-2 line-clamp-1 text-gray-900 dark:text-slate-100">
                                {t('participationDetailsTitle')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="size-9 shrink-0 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center"
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3 text-sm">
                            <div className="font-bold leading-snug text-gray-900 dark:text-slate-100">{selected.title}</div>
                            <div
                                className={`rounded-xl p-3 ${
                                    selected.userWon && selected.winningNumber
                                        ? 'bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50'
                                        : 'bg-gray-50 dark:bg-slate-800'
                                }`}
                            >
                                <div
                                    className={`grid gap-y-1 ${selected.winningNumber ? 'grid-cols-2' : 'grid-cols-1'}`}
                                >
                                    <span className="text-xs text-gray-500 dark:text-slate-400">{t('participationLabel')}</span>
                                    {selected.winningNumber ? (
                                        <span className="text-xs text-gray-500 dark:text-slate-400 text-right">
                                            {selected.userWon ? t('participationYourWinningNumber') : t('participationWinningNumber')}
                                        </span>
                                    ) : null}
                                    <strong className="text-base text-gray-900 dark:text-slate-100">
                                        {tfProduct(t, 'participationSharesLine', { n: selected.shares })}
                                    </strong>
                                    {selected.winningNumber ? (
                                        <strong
                                            className={`font-mono text-base tracking-wide text-right truncate ${
                                                selected.userWon ? 'text-yellow-700 dark:text-yellow-400' : 'text-ghana-green'
                                            }`}
                                        >
                                            {selected.winningNumber}
                                        </strong>
                                    ) : null}
                                </div>
                            </div>
                            <div className="flex justify-between rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
                                <span className="text-gray-500 dark:text-slate-400">{t('participationDetailStatus')}</span>
                                <strong className="text-gray-900 dark:text-slate-100">{participationStatusLabel(selected.status, t)}</strong>
                            </div>
                            {selected.status === 'Awaiting' && selected.drawPending ? (
                                <DrawCountdownBanner
                                    remainingSeconds={selected.drawCountdownRemaining}
                                    enabled
                                    onExpire={() => void load()}
                                />
                            ) : null}
                            <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <span className="text-gray-500 dark:text-slate-400">{t('participationDetailNumbers')}</span>
                                    {selected.numbers.length > 0 ? (
                                        <span className="text-[10px] text-gray-400 dark:text-slate-500 shrink-0">
                                            {tfProduct(t, 'participationDetailNumberCount', { n: selected.numbers.length })}
                                        </span>
                                    ) : null}
                                </div>
                                {selected.numbers.length > 0 ? (
                                    <div className="max-h-52 overflow-y-auto overscroll-contain pr-1">
                                        <div className="flex flex-wrap gap-2">
                                            {selected.numbers.map((number) => {
                                                const isWinning =
                                                    selected.winningNumber != null &&
                                                    number === selected.winningNumber;
                                                return (
                                                    <span
                                                        key={number}
                                                        className={`rounded px-2 py-1 font-mono text-xs font-bold ${
                                                            isWinning
                                                                ? 'bg-yellow-400/25 text-yellow-800 dark:text-yellow-300 ring-2 ring-yellow-500/60'
                                                                : 'bg-ghana-green/10 text-ghana-green'
                                                        }`}
                                                    >
                                                        {number}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-gray-400 text-xs">—</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <DateRangeFilterSheet
                open={dateFilterOpen}
                value={dateFilter}
                titleKey="participationDateRange"
                onClose={() => setDateFilterOpen(false)}
                onApply={setDateFilter}
            />
        </div>
    );
};

interface ApiParticipation {
    id?: number | string;
    campaign_id?: number | string;
    product_id: number | string;
    campaign_status?: string;
    product_title?: string;
    product_image?: string;
    shares?: number | string;
    count?: number | string;
    total_shares?: number | string;
    shares_sold?: number | string;
    round_no?: number | string;
    status?: string;
    numbers?: string | number[];
    winning_number?: string | null;
    user_won?: number | boolean;
    draw_pending?: boolean;
    drawPending?: boolean;
    draw_countdown_remaining?: number;
    drawCountdownRemaining?: number;
    last_participated_at?: string;
    lastParticipatedAt?: string;
}

interface ParticipationItem {
    id: string;
    productId: number;
    campaignId: number;
    title: string;
    image: string;
    shares: number;
    totalShares: number;
    sharesSold: number;
    status: string;
    numbers: string[];
    winningNumber: string | null;
    userWon: boolean;
    drawPending: boolean;
    drawCountdownRemaining: number;
    participatedAt: string;
}

const formatParticipationTitle = (title: string, roundNo: number) =>
    roundNo > 0 ? `${title} #${formatCampaignRoundNo(roundNo)}` : title;

const deriveParticipationStatus = (item: ApiParticipation): string => {
    if (item.draw_pending ?? item.drawPending) {
        return 'Awaiting';
    }
    const cs = String(item.campaign_status || item.status || '').toLowerCase();
    if (cs === 'ended') {
        return 'Announced';
    }
    const sold = Number(item.shares_sold || 0);
    const total = Number(item.total_shares || 1);
    if ((cs === 'sold_out' || cs === 'drawing' || sold >= total) && cs !== 'selling') {
        return 'Announced';
    }
    return 'Ongoing';
};

const parseNumbers = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed.map(String);
        } catch {
            return value ? [value] : [];
        }
    }
    return [];
};

export default Participation;
