import React, { useEffect, useMemo, useState } from 'react';
import { ApiService, getApiErrorMessage } from '../services/api';
import { logUnexpectedApiError } from '../lib/api-response';
import { showSimpleToast } from '../lib/simpleToast';
import type { WinningRecord } from '../types';
import { tf } from '../lib/localization';
import { useI18n } from '../lib/useI18n';
import { AppPageNav } from '../components/AppPageNav';
import { resolveAssetUrl } from '../lib/asset-url';
import { isH5Authenticated } from '../lib/auth';
import { AuthEmptyState } from '../components/AuthEmptyState';
import { WinningsListSkeleton } from '../components/winnings/WinningsSkeleton';
import { SegmentTabBar } from '../components/SegmentTabBar';
import { SupportContactLinks } from '../components/SupportContactLinks';
import { useSupportContact } from '../hooks/useSupportContact';
import {
    matchesWinningsFilter,
    winningClaimPhase,
    winningStatusBadgeClass,
    winningStatusLabelKey,
    type WinningsListFilter,
} from '../lib/winning-claim';

const FILTERS: WinningsListFilter[] = ['All', 'Pending', 'Claimed'];

const Winnings: React.FC = () => {
    const { t } = useI18n();
    const { config: supportConfig, hasAny: hasSupport } = useSupportContact();
    const [filter, setFilter] = useState<WinningsListFilter>('All');
    const [guideRecord, setGuideRecord] = useState<WinningRecord | null>(null);
    const [fulfillmentType, setFulfillmentType] = useState<'pickup' | 'delivery'>('pickup');
    const [fulfillmentName, setFulfillmentName] = useState('');
    const [fulfillmentPhone, setFulfillmentPhone] = useState('');
    const [fulfillmentAddress, setFulfillmentAddress] = useState('');
    const [fulfillmentSubmitting, setFulfillmentSubmitting] = useState(false);
    const [records, setRecords] = useState<WinningRecord[]>([]);
    const [loading, setLoading] = useState(() => isH5Authenticated());

    const isLoggedIn = isH5Authenticated();

    useEffect(() => {
        if (!isLoggedIn) {
            setLoading(false);
            return;
        }
        const load = async () => {
            try {
                const data = await ApiService.getUserWinnings();
                setRecords(data);
            } catch (error) {
                logUnexpectedApiError(error);
                showSimpleToast(getApiErrorMessage(error, t('winningsLoadFailed')));
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [isLoggedIn, t]);

    const visibleRecords = useMemo(
        () => records.filter((record) => matchesWinningsFilter(record, filter)),
        [records, filter],
    );

    const copyWinningNumber = async (number: string) => {
        try {
            await navigator.clipboard?.writeText(number);
            showSimpleToast(t('winningsNumberCopied'));
        } catch {
            showSimpleToast(t('inviteCopyFailed'));
        }
    };

    useEffect(() => {
        if (!guideRecord) return;
        setFulfillmentType(guideRecord.fulfillmentType || 'pickup');
        setFulfillmentName(guideRecord.deliveryName || '');
        setFulfillmentPhone(guideRecord.deliveryPhone || '');
        setFulfillmentAddress(guideRecord.deliveryAddress || '');
    }, [guideRecord]);

    const submitFulfillment = async () => {
        if (!guideRecord) return;
        if (!fulfillmentName.trim() || !fulfillmentPhone.trim() || (fulfillmentType === 'delivery' && fulfillmentAddress.trim().length < 8)) {
            showSimpleToast(t('winningsFulfillmentRequired'));
            return;
        }
        setFulfillmentSubmitting(true);
        try {
            await ApiService.submitWinningFulfillment(guideRecord.id, {
                type: fulfillmentType,
                name: fulfillmentName,
                phone: fulfillmentPhone,
                address: fulfillmentType === 'delivery' ? fulfillmentAddress : undefined,
            });
            showSimpleToast(t('winningsFulfillmentSaved'));
            setGuideRecord(null);
            const data = await ApiService.getUserWinnings();
            setRecords(data);
        } catch (error) {
            showSimpleToast(getApiErrorMessage(error, t('winningsFulfillmentFailed')));
        } finally {
            setFulfillmentSubmitting(false);
        }
    };

    const winningsTabs = useMemo(
        () =>
            FILTERS.map((key) => ({
                key,
                label:
                    key === 'All'
                        ? t('winningsFilterAll')
                        : key === 'Pending'
                          ? t('winningsFilterPending')
                          : t('winningsFilterClaimed'),
            })),
        [t],
    );

    return (
        <div className="flex min-h-screen flex-col bg-gray-100 pb-24 font-display text-gray-900 transition-colors dark:bg-dark-surface dark:text-slate-100">
            <AppPageNav title={t('winningsTitle')} className="bg-white/95 backdrop-blur-md dark:bg-dark-card/95" />

            <div className="flex flex-1 flex-col px-4 pt-4">
                <SegmentTabBar tabs={winningsTabs} value={filter} onChange={setFilter} />

                <main className="flex flex-1 flex-col gap-4 overflow-y-auto no-scrollbar" aria-busy={loading}>
                {!isLoggedIn ? (
                    <AuthEmptyState from="/winnings" />
                ) : (
                    <>
                        <section className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
                            <div className="flex gap-3">
                                <span
                                    className="material-symbols-outlined shrink-0 text-2xl text-amber-700 dark:text-amber-300"
                                    aria-hidden
                                >
                                    storefront
                                </span>
                                <div className="min-w-0">
                                    <h2 className="text-sm font-black text-amber-900 dark:text-amber-100">
                                        {t('winningsOfflineBannerTitle')}
                                    </h2>
                                    <p className="mt-1 text-xs leading-relaxed text-amber-800/90 dark:text-amber-200/80">
                                        {t('winningsOfflineBannerBody')}
                                    </p>
                                </div>
                            </div>
                        </section>

                        {loading && records.length === 0 ? (
                            <WinningsListSkeleton />
                        ) : visibleRecords.length === 0 ? (
                            <div className="py-12 text-center text-sm text-gray-500">{t('winningsEmpty')}</div>
                        ) : (
                            visibleRecords.map((record) => {
                                const claimed = winningClaimPhase(record.status) === 'claimed';
                                return (
                                    <article
                                        key={record.id}
                                        className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-dark-card"
                                    >
                                        <div className="absolute right-0 top-0 z-10">
                                            <span
                                                className={`inline-block rounded-bl-2xl px-3 py-1.5 text-[11px] font-bold ${winningStatusBadgeClass(record.status)}`}
                                            >
                                                {t(winningStatusLabelKey(record.status))}
                                            </span>
                                        </div>
                                        <div className="flex gap-4">
                                            <img
                                                src={resolveAssetUrl(record.product.image)}
                                                className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 object-cover dark:border-slate-700 dark:bg-slate-800"
                                                alt=""
                                            />
                                            <div className="min-w-0 flex-1 flex-col justify-start pt-0.5 pr-16">
                                                <h3 className="mb-1 line-clamp-2 text-[17px] font-bold leading-snug text-gray-900 dark:text-slate-100">
                                                    {record.product.title}
                                                </h3>
                                                <div className="mb-2 text-xs text-gray-500 dark:text-slate-500">
                                                    {tf(t, 'winningsIssueLine', { issue: String(record.issue) })}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs font-medium text-gray-500 dark:text-slate-500">
                                                        {t('winningsWinningNumberLabel')}
                                                    </span>
                                                    <span className="rounded bg-ghana-green/10 px-2 py-0.5 font-mono text-sm font-bold text-ghana-green dark:bg-ghana-green/20">
                                                        {record.winningNumber}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-slate-800">
                                            <span className="text-xs font-medium text-gray-400 dark:text-slate-600">
                                                {tf(t, 'winningsWonAt', { time: record.timestamp })}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setGuideRecord(record)}
                                                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold shadow-sm transition-transform active:scale-95 ${
                                                    claimed
                                                        ? 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300'
                                                        : 'bg-primary text-gray-900 shadow-primary/30 dark:text-gray-900'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-[18px]">
                                                    {claimed ? 'info' : 'redeem'}
                                                </span>
                                                {claimed ? t('winningsViewClaimGuide') : t('winningsClaimGuide')}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })
                        )}
                    </>
                )}
                </main>
            </div>

            {guideRecord ? (
                <Sheet title={t('winningsClaimGuideTitle')} onClose={() => setGuideRecord(null)}>
                    <div className="space-y-3">
                        <div className="rounded-xl border border-ghana-green/20 bg-ghana-green/5 p-3 dark:border-ghana-green/30 dark:bg-ghana-green/10">
                            <p className="line-clamp-1 text-xs font-semibold text-gray-500 dark:text-slate-400">
                                {guideRecord.product.title}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
                                {tf(t, 'winningsIssueLine', { issue: String(guideRecord.issue) })}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                                <div>
                                    <p className="text-[10px] font-medium text-gray-500">{t('winningsWinningNumberLabel')}</p>
                                    <p className="font-mono text-lg font-black text-ghana-green">{guideRecord.winningNumber}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void copyWinningNumber(guideRecord.winningNumber)}
                                    className="shrink-0 rounded-lg bg-ghana-green px-2.5 py-1.5 text-[11px] font-bold text-white active:scale-95"
                                >
                                    {t('winningsCopyNumber')}
                                </button>
                            </div>
                        </div>

                        <ol className="space-y-2 text-xs leading-snug text-gray-700 dark:text-slate-300">
                            {(
                                [
                                    'winningsClaimStep1',
                                    'winningsClaimStep2',
                                    'winningsClaimStep3',
                                    'winningsClaimStep4',
                                ] as const
                            ).map((key, index) => (
                                <li key={key} className="flex gap-2">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ghana-green text-[10px] font-black text-white">
                                        {index + 1}
                                    </span>
                                    <span>{t(key)}</span>
                                </li>
                            ))}
                        </ol>

                        <p className="text-[11px] leading-snug text-gray-500 dark:text-slate-400">{t('winningsClaimNote')}</p>

                        {winningClaimPhase(guideRecord.status) === 'pending' ? (
                            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/10 p-3">
                                <p className="text-sm font-black text-gray-900 dark:text-slate-100">{t('winningsFulfillmentTitle')}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setFulfillmentType('pickup')} className={`rounded-lg px-3 py-2 text-xs font-bold ${fulfillmentType === 'pickup' ? 'bg-ghana-green text-white' : 'bg-white text-gray-600 dark:bg-slate-800 dark:text-slate-300'}`}>{t('winningsPickup')}</button>
                                    <button type="button" onClick={() => setFulfillmentType('delivery')} className={`rounded-lg px-3 py-2 text-xs font-bold ${fulfillmentType === 'delivery' ? 'bg-ghana-green text-white' : 'bg-white text-gray-600 dark:bg-slate-800 dark:text-slate-300'}`}>{t('winningsDelivery')}</button>
                                </div>
                                <input value={fulfillmentName} onChange={(e) => setFulfillmentName(e.target.value)} placeholder={t('winningsRecipient')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
                                <input value={fulfillmentPhone} onChange={(e) => setFulfillmentPhone(e.target.value)} placeholder={t('winningsPhone')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
                                {fulfillmentType === 'delivery' ? <textarea value={fulfillmentAddress} onChange={(e) => setFulfillmentAddress(e.target.value)} placeholder={t('winningsAddress')} rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" /> : null}
                                <button type="button" disabled={fulfillmentSubmitting} onClick={() => void submitFulfillment()} className="w-full rounded-lg bg-primary py-2.5 text-sm font-black text-ghana-green disabled:opacity-50">{t('winningsSaveFulfillment')}</button>
                            </div>
                        ) : null}

                        {hasSupport ? (
                            <div>
                                <p className="mb-1.5 text-[11px] font-bold text-gray-700 dark:text-slate-300">
                                    {t('winningsContactSupport')}
                                </p>
                                <SupportContactLinks config={supportConfig} />
                            </div>
                        ) : (
                            <p className="text-[11px] text-gray-500">{t('winningsNoSupportHint')}</p>
                        )}
                    </div>
                </Sheet>
            ) : null}
        </div>
    );
};

const Sheet = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => {
    const { t } = useI18n();
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
            <div className="flex max-h-[min(520px,78vh)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-dark-card">
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-800">
                    <h3 className="text-base font-black text-gray-900 dark:text-slate-100">{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex size-9 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800"
                        aria-label={t('commonClose')}
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
            </div>
        </div>
    );
};

export default Winnings;
