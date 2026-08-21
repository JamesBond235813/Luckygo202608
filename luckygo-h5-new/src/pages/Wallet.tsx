import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiService, getApiErrorMessage } from '../services/api';
import { formatCurrency } from '../lib/localization';
import { resolveCheckoutUrl } from '../lib/payment-url';
import { saveWalletCheckoutSession } from '../lib/wallet-payment-session';
import { showSimpleToast } from '../lib/simpleToast';
import { useI18n } from '../lib/useI18n';
import { useUserProfile } from '../context/UserProfileContext';
import { AppPageNav } from '../components/AppPageNav';
import { WalletSheet } from '../components/wallet/WalletSheet';
import { isH5Authenticated } from '../lib/auth';
import { AuthEmptyState } from '../components/AuthEmptyState';
import { useAgeCompliance } from '../context/AgeComplianceContext';
import { AgeDisclaimerBar } from '../components/age/AgeDisclaimerBar';
import { isAgeConfirmationRequiredError } from '../lib/age-compliance-api';
import { SupportContactLinks } from '../components/SupportContactLinks';
import { useSupportContact } from '../hooks/useSupportContact';

const walletFieldInputClass =
    'w-full rounded-xl border border-gray-200 px-4 py-3 text-base font-normal outline-none placeholder:text-gray-400 placeholder:font-normal focus:border-ghana-green';

const Wallet: React.FC = () => {
    const { t } = useI18n();
    const navigate = useNavigate();
    const { user, loading: profileLoading, refreshUser } = useUserProfile();
    const isLoggedIn = isH5Authenticated();
    const { config: supportConfig, hasAny: hasSupport } = useSupportContact();
    const { runAdultAction } = useAgeCompliance();
    const [searchParams] = useSearchParams();
    const paymentReturnHandled = useRef(false);
    const [topUpOpen, setTopUpOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [supportOpen, setSupportOpen] = useState(false);
    const [topUpAmountInput, setTopUpAmountInput] = useState('');
    const [paymentLoading, setPaymentLoading] = useState(false);

    useEffect(() => {
        const checkoutId = searchParams.get('checkoutId')?.trim();
        const clientReference = searchParams.get('clientReference')?.trim();
        const sandboxReturn = searchParams.get('hubtelSandbox') === 'success';
        if (!checkoutId && !clientReference && !sandboxReturn) return;
        if (paymentReturnHandled.current) return;
        paymentReturnHandled.current = true;

        void (async () => {
            try {
                const result = await ApiService.confirmHubtelPayment({
                    checkoutId: checkoutId || undefined,
                    clientReference: clientReference || undefined,
                });
                await refreshUser();
                if (result.settled || result.paymentStatus === 'success') {
                    showSimpleToast(t('walletPaySuccess'));
                    window.dispatchEvent(new Event('luckygo-notifications-change'));
                } else {
                    showSimpleToast(t('walletPayPending'));
                }
            } catch (error) {
                showSimpleToast(getApiErrorMessage(error, t('walletPayConfirmFailed')));
            } finally {
                navigate('/wallet', { replace: true });
            }
        })();
    }, [searchParams, navigate, refreshUser, t]);

    if (!isLoggedIn) {
        return (
            <div className="bg-gray-50 dark:bg-dark-surface min-h-screen pb-24">
                <AppPageNav title={t('walletTitle')} onBack={() => navigate('/me')} />
                <AuthEmptyState from="/wallet" />
            </div>
        );
    }

    if (profileLoading && !user) {
        return <div className="p-8 text-center text-sm text-gray-500">{t('commonLoading')}</div>;
    }

    if (!user) {
        return null;
    }

    const parsedTopUpAmount = Number.parseFloat(topUpAmountInput.replace(/,/g, ''));

    const startHubtelPayment = async () => {
        if (!Number.isFinite(parsedTopUpAmount) || parsedTopUpAmount <= 0) {
            showSimpleToast(t('walletAmountInvalid'));
            return;
        }
        setPaymentLoading(true);
        try {
            const payReturn = `${window.location.origin}/wallet/pay/return`;
            const result = await ApiService.initiateHubtelPayment({
                amount: parsedTopUpAmount,
                returnUrl: payReturn,
                cancellationUrl: payReturn,
            });
            const checkoutUrl = resolveCheckoutUrl(
                result.checkoutUrl || result.checkoutDirectUrl || result.paymentUrl,
            );
            if (checkoutUrl) {
                setTopUpOpen(false);
                saveWalletCheckoutSession(checkoutUrl, {
                    clientReference: String(result.clientReference ?? '').trim() || undefined,
                    checkoutId: String(result.checkoutId ?? '').trim() || undefined,
                });
                navigate('/wallet/pay');
                return;
            }
            showSimpleToast(t('walletHubtelNoUrl'));
        } catch (error: unknown) {
            if (isAgeConfirmationRequiredError(error)) {
                showSimpleToast(t('ageGateRequired'));
            } else {
                showSimpleToast(getApiErrorMessage(error, t('walletPayErrorFallback')));
            }
        } finally {
            setPaymentLoading(false);
        }
    };

    return (
        <div className="bg-gray-100 dark:bg-dark-surface font-display text-gray-900 dark:text-slate-100 min-h-screen flex flex-col transition-colors duration-300">
            {/* Header */}
            <AppPageNav
                title={t('walletTitle')}
                onBack={() => navigate('/me')}
                className="border-b-gray-200 dark:border-slate-800"
                right={
                    <button
                        type="button"
                        onClick={() => setHelpOpen(true)}
                        className="flex size-10 items-center justify-center rounded-full text-gray-900 transition-colors hover:bg-gray-50 dark:text-slate-100 dark:hover:bg-slate-800"
                        aria-label={t('walletHelpTitle')}
                    >
                        <span className="material-symbols-outlined">help_outline</span>
                    </button>
                }
            />

            <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                {/* Balance Card */}
                <div className="relative z-10 rounded-b-[2.5rem] bg-white px-5 pb-12 pt-5 shadow-sm transition-colors dark:bg-dark-card sm:px-6">
                    <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-100 bg-gray-50/80 p-5 dark:border-slate-700 dark:bg-slate-800/40">
                        <div className="text-center">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                {t('walletDrawTotalLabel')}
                            </p>
                            <p className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 tabular-nums dark:text-slate-100 sm:text-5xl">
                                {formatCurrency(user.totalBalance)}
                            </p>
                            <p className="mx-auto mt-2 max-w-[280px] text-center text-[11px] leading-snug text-gray-500 dark:text-slate-400">
                                {t('walletDrawTotalHint')}
                            </p>
                        </div>
                        <div className="mt-5 space-y-0 border-t border-gray-200/80 pt-4 dark:border-slate-600/80">
                            <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{t('walletRowWithdrawableLabel')}</p>
                                    <p className="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-slate-400">
                                        {t('walletRowWithdrawableDesc')}
                                    </p>
                                </div>
                                <p className="shrink-0 text-base font-bold tabular-nums text-gray-900 dark:text-slate-100 sm:text-lg">
                                    {formatCurrency(user.balance)}
                                </p>
                            </div>
                            <div className="flex items-start justify-between gap-4 border-t border-gray-100 py-2.5 dark:border-slate-700/80">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{t('walletRowExchangeLabel')}</p>
                                    <p className="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-slate-400">
                                        {t('walletRowExchangeDesc')}
                                    </p>
                                </div>
                                <p className="shrink-0 text-base font-bold tabular-nums text-gray-800 dark:text-slate-200 sm:text-lg">
                                    {formatCurrency(user.exchangeBalance)}
                                </p>
                            </div>
                            <div className="flex items-start justify-between gap-4 border-t border-gray-100 py-2.5 dark:border-slate-700/80">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{t('walletRowBeansLabel')}</p>
                                    <p className="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-slate-400">
                                        {t('walletRowBeansDesc')}
                                    </p>
                                </div>
                                <p className="shrink-0 text-base font-bold tabular-nums text-gray-900 dark:text-slate-100 sm:text-lg">
                                    {user.beans.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="px-6 -mt-8 mb-8 relative z-20">
                    <div className="flex gap-4 sm:gap-5">
                        <button
                            type="button"
                            onClick={() => {
                                setTopUpAmountInput('');
                                setTopUpOpen(true);
                            }}
                            className="flex-1 group relative overflow-hidden rounded-2xl h-16 bg-ghana-green shadow-lg transition-all duration-300 active:scale-[0.98]"
                        >
                            <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-3 h-full w-full">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black/10">
                                    <span className="material-symbols-outlined text-lg leading-none text-white sm:text-xl">add</span>
                                </div>
                                <span className="text-white text-base sm:text-lg font-extrabold tracking-wide">{t('topUp')}</span>
                            </div>
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                        </button>
                        <button
                            type="button"
                            onClick={() => showSimpleToast(t('walletWithdrawUnavailable'))}
                            className="flex-1 group relative overflow-hidden rounded-2xl h-16 bg-accent shadow-lg transition-all duration-300 active:scale-[0.98]"
                        >
                            <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-3 h-full w-full">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black/5">
                                    <span className="material-symbols-outlined text-lg leading-none text-ghana-green-dark sm:text-xl">arrow_outward</span>
                                </div>
                                <span className="text-ghana-green-dark text-base sm:text-lg font-extrabold tracking-wide">{t('withdraw')}</span>
                            </div>
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                        </button>
                    </div>
                </div>

                <div className="px-6 mb-6">
                    <button
                        type="button"
                        onClick={() => navigate('/transactions')}
                        className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all active:scale-[0.99] hover:shadow-md dark:border-slate-800 dark:bg-dark-card"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex size-11 items-center justify-center rounded-xl bg-gray-50 text-gray-700 dark:bg-slate-800 dark:text-slate-200">
                                <span className="material-symbols-outlined text-2xl">receipt_long</span>
                            </div>
                            <span className="text-base font-bold text-gray-900 dark:text-slate-100">{t('walletTxHistory')}</span>
                        </div>
                        <span className="material-symbols-outlined text-gray-400 dark:text-slate-500">chevron_right</span>
                    </button>
                </div>

                <div className="px-8 mt-4 mb-8 text-center">
                    <AgeDisclaimerBar className="mb-2" />
                    <p className="text-[11px] text-gray-500 dark:text-slate-500 leading-relaxed font-medium uppercase tracking-widest">
                        {t('walletFooterLine1')}
                        {hasSupport ? (
                            <>
                                <br />
                                {t('walletFooterLine2Start')}
                                <button
                                    type="button"
                                    onClick={() => setSupportOpen(true)}
                                    className="text-ghana-green dark:text-primary hover:underline font-bold"
                                >
                                    {t('walletSupportLink')}
                                </button>
                                {t('walletFooterLine2End')}
                            </>
                        ) : null}
                    </p>
                </div>
            </div>
            {topUpOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 pb-24">
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-dark-card">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">{t('topUp')}</h3>
                            <button
                                type="button"
                                onClick={() => setTopUpOpen(false)}
                                className="size-9 rounded-full bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                        <div className="space-y-3">
                        <input
                            type="text"
                            inputMode="decimal"
                            autoFocus
                            value={topUpAmountInput}
                            onChange={(event) => {
                                const raw = event.target.value.replace(/[^\d.]/g, '');
                                const dot = raw.indexOf('.');
                                const normalized =
                                    dot === -1
                                        ? raw
                                        : `${raw.slice(0, dot + 1)}${raw.slice(dot + 1).replace(/\./g, '')}`;
                                setTopUpAmountInput(normalized);
                            }}
                            placeholder={t('walletTopUpAmountPlaceholder')}
                            className={walletFieldInputClass}
                        />
                        <div className="grid grid-cols-3 gap-2">
                            {[10, 20, 50].map((amount) => (
                                <button
                                    key={amount}
                                    type="button"
                                    onClick={() => setTopUpAmountInput(String(amount))}
                                    className="rounded-xl bg-gray-100 py-2 text-sm font-bold text-gray-700 active:bg-ghana-green active:text-white dark:bg-slate-800 dark:text-slate-200"
                                >
                                    {formatCurrency(amount)}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            disabled={paymentLoading || !topUpAmountInput.trim()}
                            onClick={() => runAdultAction(() => void startHubtelPayment(), { spendConfirm: true })}
                            className="w-full rounded-xl bg-ghana-green py-3 text-white font-black disabled:opacity-50"
                        >
                            {paymentLoading ? t('walletPayStarting') : t('walletPayHubtel')}
                        </button>
                        </div>
                    </div>
                </div>
            )}
            {helpOpen && (
                <WalletSheet title={t('walletHelpTitle')} onClose={() => setHelpOpen(false)}>
                    <div className="space-y-3 text-sm text-gray-600">
                        <p>{t('walletHelpP1')}</p>
                        <p>{t('walletHelpP2')}</p>
                        <p>{t('walletHelpP3')}</p>
                    </div>
                </WalletSheet>
            )}
            {supportOpen && hasSupport ? (
                <WalletSheet title={t('walletSupportTitle')} onClose={() => setSupportOpen(false)}>
                    <SupportContactLinks config={supportConfig} />
                </WalletSheet>
            ) : null}
        </div>
    );
};

export default Wallet;
