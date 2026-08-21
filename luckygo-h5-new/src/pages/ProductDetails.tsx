import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Product } from '../types';
import { ApiService, getApiErrorMessage } from '../services/api';
import { logUnexpectedApiError } from '../lib/api-response';
import { formatCurrency, formatCurrencyPlain, tf } from '../lib/localization';
import { useI18n } from '../lib/useI18n';
import { showSimpleToast } from '../lib/simpleToast';
import { promptLogin } from '../lib/require-login';
import { useAgeCompliance } from '../context/AgeComplianceContext';
import { useUserProfile } from '../context/UserProfileContext';
import { AgeDisclaimerBar } from '../components/age/AgeDisclaimerBar';
import { isAgeConfirmationRequiredError } from '../lib/age-compliance-api';
import { AppPageNav } from '../components/AppPageNav';
import { resolveAssetUrl } from '../lib/asset-url';
import { DrawCountdownBanner } from '../components/DrawCountdownBanner';
import { MIN_PARTICIPATION_GHS } from '../constants';
import { getCampaignPurchaseState } from '../lib/campaign-purchase-state';
import { meetsMinParticipationAmount, resolveMinShareCount } from '../lib/participation-config';

function clampShareInput(raw: string, minShares: number, maxShares: number): string {
    const min = Math.max(minShares, 1);
    const max = Math.max(maxShares, min);
    const trimmed = raw.trim();
    if (trimmed === '') return String(min);
    const parsed = parseInt(trimmed, 10);
    if (!Number.isFinite(parsed)) return String(min);
    return String(Math.min(Math.max(parsed, min), max));
}

function resolveShareCount(raw: string, minShares: number, maxShares: number): number {
    return Number(clampShareInput(raw, minShares, maxShares));
}

const ProductDetails: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useI18n();
    const { user, refreshUser } = useUserProfile();
    const { runAdultAction } = useAgeCompliance();
    const [shareInput, setShareInput] = useState('');
    const [isSnatching, setIsSnatching] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [purchasedNumbers, setPurchasedNumbers] = useState<string[]>([]);
    const [rulesOpen, setRulesOpen] = useState(true);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [product, setProduct] = useState<Product | null>(null);
    const fetchProduct = React.useCallback(async () => {
        if (!id) return;
        try {
            const data = await ApiService.getProduct(id);
            setProduct(data);
        } catch (e) {
            logUnexpectedApiError(e);
            showSimpleToast(getApiErrorMessage(e, t('productLoadFailed')));
        }
    }, [id, t]);

    React.useEffect(() => {
        void fetchProduct();
    }, [fetchProduct]);

    React.useEffect(() => {
        if (!product) return;
        const minShares = resolveMinShareCount(product.pricePerShare);
        const maxShares = Math.max(product.totalShares - product.sharesSold, minShares);
        setShareInput((prev) => clampShareInput(prev || String(minShares), minShares, maxShares));
    }, [product]);

    if (!product) {
        return (
            <div className="min-h-screen bg-surface dark:bg-dark-surface">
                <AppPageNav title={t('productDetailsTitle')} />
                <div className="p-10 text-center">{t('productLoading')}</div>
            </div>
        );
    }

    const progress = (product.sharesSold / product.totalShares) * 100;
    const remainingShares = Math.max(product.totalShares - product.sharesSold, 0);
    const minShares = resolveMinShareCount(product.pricePerShare);
    const maxShares = Math.max(remainingShares, minShares);
    const canMeetMinimum = remainingShares >= minShares;
    const normalizedShares = resolveShareCount(shareInput || String(minShares), minShares, maxShares);
    const drawPending = Boolean(product.drawPending);
    const purchaseState = getCampaignPurchaseState(product);
    const canPurchase = purchaseState === 'open';

    const orderTotal = normalizedShares * product.pricePerShare;

    const openConfirm = () => {
        if (!canPurchase) {
            showSimpleToast(drawPending ? t('productSoldOutWaiting') : t('productAlertFullyFunded'));
            return;
        }
        if (!canMeetMinimum) {
            showSimpleToast(
                tf(t, 'productMinParticipation', { amount: formatCurrencyPlain(MIN_PARTICIPATION_GHS) }),
            );
            return;
        }
        if (!meetsMinParticipationAmount(normalizedShares, product.pricePerShare)) {
            showSimpleToast(
                tf(t, 'productMinParticipation', { amount: formatCurrencyPlain(MIN_PARTICIPATION_GHS) }),
            );
            return;
        }
        if (!promptLogin(navigate, t('authLoginRequired'))) {
            return;
        }
        if (!user) {
            showSimpleToast(t('productBalanceUnavailable'));
            return;
        }
        runAdultAction(() => {
            const available = user.totalBalance;
            if (available + 1e-9 < orderTotal) {
                showSimpleToast(t('productInsufficientBalance'));
                return;
            }
            setConfirmOpen(true);
        });
    };

    const confirmPlaceOrder = () => {
        runAdultAction(() => {
        setConfirmOpen(false);
        setIsSnatching(true);
        ApiService.placeOrder({ campaignId: product.id, count: normalizedShares })
            .then(async (result) => {
                setPurchasedNumbers(result.numbers || []);
                setShowSuccess(true);
                await fetchProduct();
                await refreshUser();
            })
            .catch((e) => {
                logUnexpectedApiError(e);
                if (isAgeConfirmationRequiredError(e)) {
                    showSimpleToast(t('ageGateRequired'));
                    return;
                }
                const msg = getApiErrorMessage(e, t('productOrderFailed'));
                if (/insufficient balance/i.test(msg)) {
                    showSimpleToast(t('productInsufficientBalance'));
                } else {
                    showSimpleToast(msg);
                }
            })
            .finally(() => {
                setIsSnatching(false);
            });
        }, { spendConfirm: true });
    };

    return (
        <div className="relative min-h-screen bg-surface pb-32 transition-colors duration-300 dark:bg-dark-surface">
            <AppPageNav title={t('productDetailsTitle')} />

            <main>
                    <div className="relative w-full aspect-square overflow-hidden bg-white dark:bg-slate-900">
                        <img
                            src={resolveAssetUrl(product.image)}
                            className="h-full w-full object-cover"
                            alt=""
                        />
                    </div>

                    <div className="px-5 py-4 space-y-3">
                        <div className="space-y-2">
                                <div className="grid grid-cols-[88px_1fr] items-start gap-2">
                                    {product.tag && (
                                        <span className="mt-0.5 rounded bg-ghana-red px-2 py-1 text-center text-[10px] font-black uppercase leading-3 text-white shadow-sm">
                                            {product.tag}
                                        </span>
                                    )}
                                    <h2 className="text-lg font-extrabold text-gray-900 dark:text-slate-100 leading-tight line-clamp-2">
                                        {product.title}
                                    </h2>
                                </div>
                            <p className="text-sm text-gray-500 dark:text-slate-400 leading-6 line-clamp-2">{product.description}</p>
                        </div>

                        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-ghana-red text-2xl font-black">{formatCurrencyPlain(product.pricePerShare)}</span>
                                <span className="text-gray-400 dark:text-slate-500 text-sm font-medium">{t('commonPerShare')}</span>
                            </div>
                            <p className="mb-3 text-xs text-gray-500 dark:text-slate-400">
                                {tf(t, 'productMinParticipationHint', {
                                    amount: formatCurrencyPlain(MIN_PARTICIPATION_GHS),
                                })}
                            </p>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-ghana-green">{tf(t, 'commonFunded', { pct: Math.round(progress) })}</span>
                                    <span className="text-gray-400 dark:text-slate-500">
                                        {tf(t, 'productSharesProgress', { sold: String(product.sharesSold), total: String(product.totalShares) })}
                                    </span>
                                </div>
                                    <div className="h-2.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-ghana-green to-emerald-400 rounded-full transition-all duration-1000"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                            </div>
                        </div>

                        {drawPending ? (
                            <DrawCountdownBanner
                                remainingSeconds={product.drawCountdownRemaining ?? 0}
                                enabled
                                onExpire={() => void fetchProduct()}
                            />
                        ) : null}

                        <div className="space-y-3">
                            <div className="bg-white p-3 rounded-xl border border-gray-100 dark:bg-dark-card dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setRulesOpen(!rulesOpen)}
                                    className="w-full flex items-center justify-between"
                                >
                                    <h4 className="font-bold text-sm">{t('productDrawRules')}</h4>
                                    <span className={`material-symbols-outlined transition-transform ${rulesOpen ? 'rotate-180' : ''}`}>
                                        expand_more
                                    </span>
                                </button>
                                {rulesOpen && (
                                    <div className="mt-2 space-y-1.5 text-xs text-gray-500 dark:text-slate-400">
                                        <p>{t('productRule1')}</p>
                                        <p>{t('productRule2')}</p>
                                        <p>{t('productRule3')}</p>
                                        <p>{t('productRule4')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-card border-t border-gray-100 dark:border-slate-800 px-5 pt-3 pb-6 transition-colors">
                {purchaseState === 'open' ? (
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-36 shrink-0 items-center justify-between bg-gray-50 dark:bg-slate-800 px-3 rounded-xl border border-gray-100 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => setShareInput(String(Math.max(minShares, normalizedShares - 1)))}
                                className="text-gray-400 dark:text-slate-500 hover:text-ghana-green"
                            >
                                <span className="material-symbols-outlined text-xl">remove</span>
                            </button>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={shareInput}
                                onChange={(e) => {
                                    const next = e.target.value;
                                    if (next === '' || /^\d+$/.test(next)) {
                                        setShareInput(next);
                                    }
                                }}
                                onBlur={() => setShareInput((prev) => clampShareInput(prev, minShares, maxShares))}
                                className="w-12 bg-transparent text-center text-lg font-black text-gray-900 dark:text-slate-100 border-none focus:ring-0 p-0"
                            />
                            <button
                                type="button"
                                onClick={() => setShareInput(String(Math.min(normalizedShares + 1, maxShares)))}
                                className="text-gray-400 dark:text-slate-500 hover:text-ghana-green"
                            >
                                <span className="material-symbols-outlined text-xl">add</span>
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => void openConfirm()}
                            disabled={isSnatching || !canMeetMinimum}
                            className="min-w-0 flex-1 bg-primary hover:bg-primary-hover text-ghana-green-dark font-black text-sm h-12 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
                        >
                            {isSnatching ? (
                                <span>{t('productProcessing')}</span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined filled text-xl">bolt</span>
                                    <span className="truncate">{tf(t, 'productSnatchCta', { n: normalizedShares })}</span>
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        disabled={purchaseState === 'awaiting' || isSnatching}
                        onClick={() => {
                            if (purchaseState === 'closed') {
                                navigate('/history');
                            }
                        }}
                        className={`flex h-12 w-full items-center justify-center rounded-2xl text-sm font-black transition-all active:scale-[0.98] disabled:opacity-80 ${
                            purchaseState === 'awaiting'
                                ? 'bg-gray-200 text-gray-500 dark:bg-slate-800 dark:text-slate-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                    >
                        {purchaseState === 'awaiting' ? t('productSoldOutWaiting') : t('productViewDrawResult')}
                    </button>
                )}
            </footer>

            {confirmOpen && (
                <div className="fixed inset-0 z-[65] flex items-center justify-center px-6 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl transition-colors dark:bg-dark-card">
                        <h3 className="mb-2 text-lg font-black text-gray-900 dark:text-slate-100">{t('productConfirmTitle')}</h3>
                        <p className="mb-4 text-sm leading-relaxed text-gray-500 dark:text-slate-400">{t('productConfirmHint')}</p>
                        <div className="mb-6 space-y-2 text-sm">
                            <div className="flex justify-between rounded-xl bg-gray-50 p-3 dark:bg-slate-800">
                                <span className="text-gray-500 dark:text-slate-400">{t('productConfirmProduct')}</span>
                                <span className="max-w-[60%] text-right font-bold leading-snug text-gray-900 line-clamp-2 dark:text-slate-100">
                                    {product.title}
                                </span>
                            </div>
                            <div className="flex justify-between rounded-xl bg-gray-50 p-3 dark:bg-slate-800">
                                <span className="text-gray-500 dark:text-slate-400">{t('productConfirmShares')}</span>
                                <span className="font-bold text-gray-900 dark:text-slate-100">{normalizedShares}</span>
                            </div>
                            <div className="flex justify-between rounded-xl bg-gray-50 p-3 dark:bg-slate-800">
                                <span className="text-gray-500 dark:text-slate-400">{t('productConfirmTotal')}</span>
                                <span className="text-base font-black text-ghana-red">{formatCurrency(orderTotal)}</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmOpen(false)}
                                disabled={isSnatching}
                                className="flex-1 h-12 rounded-2xl border border-gray-200 text-sm font-bold text-gray-700 transition-all active:scale-95 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
                            >
                                {t('commonCancel')}
                            </button>
                            <button
                                type="button"
                                onClick={confirmPlaceOrder}
                                disabled={isSnatching}
                                className="flex-1 h-12 rounded-2xl bg-primary text-sm font-black text-gray-900 transition-all active:scale-95 disabled:opacity-70"
                            >
                                {t('productConfirmSubmit')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSuccess && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-black/60 backdrop-blur-md">
                    <div className="relative flex w-full max-w-sm flex-col items-center rounded-3xl bg-white p-8 text-center shadow-2xl transition-colors dark:bg-dark-card">
                        <button
                            type="button"
                            onClick={() => setShowSuccess(false)}
                            className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-gray-100 transition-transform active:scale-95 dark:bg-slate-800"
                            aria-label={t('commonClose')}
                        >
                            <span className="material-symbols-outlined text-xl text-gray-600 dark:text-slate-300">close</span>
                        </button>
                        <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-ghana-green/10">
                            <span className="material-symbols-outlined animate-bounce text-5xl text-ghana-green filled">verified</span>
                        </div>
                        <h3 className="mb-2 text-2xl font-black text-gray-900 dark:text-slate-100">{t('productSuccessTitle')}</h3>
                        <p className="mb-8 leading-relaxed text-gray-500 dark:text-slate-400">
                            {tf(t, 'productSuccessBody', { n: normalizedShares })}
                        </p>
                        {purchasedNumbers.length > 0 && (
                            <div className="mb-5 w-full rounded-xl bg-gray-50 p-3 text-left dark:bg-slate-800/80">
                                <div className="mb-2 text-xs font-bold text-gray-500">{t('productYourNumbers')}</div>
                                <div className="max-h-[4.5rem] overflow-hidden">
                                    <div className="flex flex-wrap gap-2">
                                        {purchasedNumbers.map((number) => (
                                            <span
                                                key={number}
                                                className="rounded bg-ghana-green/10 px-2 py-1 font-mono text-xs font-bold leading-tight text-ghana-green"
                                            >
                                                {number}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {purchasedNumbers.length > 6 && (
                                    <p className="mt-1.5 text-[10px] leading-snug text-gray-400 dark:text-slate-500">
                                        {t('productNumbersSeeAll')}
                                    </p>
                                )}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setShowSuccess(false);
                                navigate('/participation');
                            }}
                            className="mb-3 h-12 w-full rounded-2xl bg-ghana-green text-sm font-bold text-white shadow-lg transition-all active:scale-95"
                        >
                            {t('productViewParticipation')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowSuccess(false)}
                            className="h-12 w-full rounded-2xl border border-gray-200 text-sm font-bold text-gray-700 transition-all active:scale-95 dark:border-slate-700 dark:text-slate-200"
                        >
                            {t('productStayHere')}
                        </button>
                    </div>
                </div>
            )}
            <AgeDisclaimerBar className="px-5 pb-8" />
        </div>
    );
};

export default ProductDetails;
