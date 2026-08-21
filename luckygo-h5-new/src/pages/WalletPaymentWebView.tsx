import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../services/api';
import { AppPageNav } from '../components/AppPageNav';
import {
    clearWalletCheckoutSession,
    isAllowedPaymentUrl,
    readWalletCheckoutSession,
} from '../lib/wallet-payment-session';
import { showSimpleToast } from '../lib/simpleToast';
import { useI18n } from '../lib/useI18n';
import { useUserProfile } from '../context/UserProfileContext';

type PayReturnMessage = {
    type: 'wallet-pay-return';
    ok: boolean;
    settled?: boolean;
    paymentStatus?: string;
    message?: string;
};

const WalletPaymentWebView: React.FC = () => {
    const { t } = useI18n();
    const navigate = useNavigate();
    const { refreshUser } = useUserProfile();
    const [confirming, setConfirming] = useState(false);

    const checkoutUrl = useMemo(() => {
        const { checkoutUrl: url } = readWalletCheckoutSession();
        if (!url || !isAllowedPaymentUrl(url)) return null;
        return url;
    }, []);

    const finishAndLeave = useCallback(() => {
        clearWalletCheckoutSession();
        navigate('/wallet', { replace: true });
    }, [navigate]);

    const handleReturnMessage = useCallback(
        async (data: PayReturnMessage) => {
            if (data.type !== 'wallet-pay-return' || confirming) return;
            setConfirming(true);
            try {
                if (data.ok) {
                    await refreshUser();
                    if (data.settled || data.paymentStatus === 'success') {
                        showSimpleToast(t('walletPaySuccess'));
                    } else {
                        showSimpleToast(t('walletPayPending'));
                    }
                } else if (data.message) {
                    showSimpleToast(data.message);
                }
            } catch (error) {
                showSimpleToast(getApiErrorMessage(error, t('walletPayConfirmFailed')));
            } finally {
                setConfirming(false);
                finishAndLeave();
            }
        },
        [confirming, finishAndLeave, refreshUser, t],
    );

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            const data = event.data as PayReturnMessage;
            if (data?.type === 'wallet-pay-return') {
                void handleReturnMessage(data);
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [handleReturnMessage]);

    useEffect(() => {
        if (!checkoutUrl) {
            showSimpleToast(t('walletHubtelNoUrl'));
            finishAndLeave();
        }
    }, [checkoutUrl, finishAndLeave, t]);

    if (!checkoutUrl) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-dark-surface">
                <p className="text-sm text-gray-500">{t('commonLoading')}</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-gray-100 dark:bg-dark-surface">
            <AppPageNav
                title={t('walletPayWebViewTitle')}
                onBack={finishAndLeave}
            />
            <div className="relative min-h-0 flex-1">
                <iframe
                    title={t('walletPayWebViewTitle')}
                    src={checkoutUrl}
                    className="absolute inset-0 h-full w-full border-0 bg-white"
                    allow="payment *; fullscreen"
                    referrerPolicy="no-referrer-when-downgrade"
                />
                {confirming ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <p className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-lg dark:bg-dark-card dark:text-slate-100">
                            {t('walletPayReturnProcessing')}
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default WalletPaymentWebView;
