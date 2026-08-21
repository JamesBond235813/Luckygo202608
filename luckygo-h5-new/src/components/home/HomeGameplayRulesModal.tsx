import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MIN_PARTICIPATION_GHS } from '../../constants';
import { CURRENCY_SYMBOL, formatCurrencyPlain, tf } from '../../lib/localization';
import { useI18n } from '../../lib/useI18n';

type HomeGameplayRulesModalProps = {
    open: boolean;
    onClose: () => void;
};

const RULE_KEYS = ['homeRulesP1', 'homeRulesP2', 'homeRulesP3', 'homeRulesP4'] as const;

export function HomeGameplayRulesModal({ open, onClose }: HomeGameplayRulesModalProps) {
    const { t } = useI18n();

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    const minAmount = formatCurrencyPlain(MIN_PARTICIPATION_GHS);
    const rules = RULE_KEYS.map((key) =>
        tf(t, key, {
            minAmount,
            currency: CURRENCY_SYMBOL,
        }),
    );

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-gameplay-rules-title"
            onClick={onClose}
        >
            <div
                className="relative z-[1] flex max-h-[min(28rem,85vh)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                    <h3 id="home-gameplay-rules-title" className="text-lg font-black text-ghana-green">
                        {t('homeRulesTitle')}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
                        aria-label={t('commonClose')}
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>
                <ol className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
                    {rules.map((rule, index) => (
                        <li
                            key={RULE_KEYS[index]}
                            className="flex gap-2.5 text-sm leading-relaxed text-gray-600 dark:text-slate-300"
                        >
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ghana-green/10 text-xs font-black text-ghana-green">
                                {index + 1}
                            </span>
                            <span>{rule}</span>
                        </li>
                    ))}
                </ol>
            </div>
        </div>,
        document.body,
    );
}
