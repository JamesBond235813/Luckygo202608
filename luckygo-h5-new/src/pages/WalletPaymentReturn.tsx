import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiService, getApiErrorMessage } from '../services/api';
import { clearWalletCheckoutSession } from '../lib/wallet-payment-session';
import { useI18n } from '../lib/useI18n';

/** Hubtel 支付完成回跳（可在 iframe 内加载） */
const WalletPaymentReturn: React.FC = () => {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const handled = useRef(false);

    useEffect(() => {
        if (handled.current) return;
        handled.current = true;

        const checkoutId = searchParams.get('checkoutId')?.trim() || undefined;
        const clientReference = searchParams.get('clientReference')?.trim() || undefined;
        const sandboxReturn = searchParams.get('hubtelSandbox') === 'success';

        void (async () => {
            let payload: {
                type: 'wallet-pay-return';
                ok: boolean;
                settled?: boolean;
                paymentStatus?: string;
                message?: string;
            } = { type: 'wallet-pay-return', ok: false };

            try {
                if (checkoutId || clientReference || sandboxReturn) {
                    const result = await ApiService.confirmHubtelPayment({
                        checkoutId,
                        clientReference,
                    });
                    payload = {
                        type: 'wallet-pay-return',
                        ok: true,
                        settled: result.settled,
                        paymentStatus: result.paymentStatus,
                    };
                }
            } catch (error) {
                payload = {
                    type: 'wallet-pay-return',
                    ok: false,
                    message: getApiErrorMessage(error, t('walletPayConfirmFailed')),
                };
            } finally {
                clearWalletCheckoutSession();
            }

            if (window.parent !== window) {
                window.parent.postMessage(payload, window.location.origin);
                return;
            }

            const qs = new URLSearchParams();
            if (checkoutId) qs.set('checkoutId', checkoutId);
            if (clientReference) qs.set('clientReference', clientReference);
            if (sandboxReturn) qs.set('hubtelSandbox', 'success');
            navigate(`/wallet?${qs.toString()}`, { replace: true });
        })();
    }, [navigate, searchParams, t]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-dark-surface">
            <p className="text-sm text-gray-500 dark:text-slate-400">{t('walletPayReturnProcessing')}</p>
        </div>
    );
};

export default WalletPaymentReturn;
