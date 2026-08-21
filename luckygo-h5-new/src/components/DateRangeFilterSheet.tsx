import { useEffect, useState } from 'react';
import { dateFromIsoYmd } from '../lib/ghana-datetime';
import type { TxDateFilter, TxDatePreset } from '../lib/tx-date-filter';
import { defaultTxDateFilter } from '../lib/tx-date-filter';
import { useI18n } from '../lib/useI18n';
import { GhanaDatePickerField } from './wallet/GhanaDatePickerField';

type Props = {
    open: boolean;
    value: TxDateFilter;
    onClose: () => void;
    onApply: (next: TxDateFilter) => void;
    /** i18n key for sheet title; default walletTxDateRange */
    titleKey?: string;
};

export function DateRangeFilterSheet({
    open,
    value,
    onClose,
    onApply,
    titleKey = 'walletTxDateRange',
}: Props) {
    const { t } = useI18n();
    const [draft, setDraft] = useState<TxDateFilter>(value);

    useEffect(() => {
        if (!open) return;
        const timer = window.setTimeout(() => setDraft(value), 0);
        return () => window.clearTimeout(timer);
    }, [open, value]);

    if (!open) return null;

    const presets: { key: TxDatePreset; labelKey: string }[] = [
        { key: 'all', labelKey: 'historyFilterAllTime' },
        { key: 'today', labelKey: 'historyFilterToday' },
        { key: 'week', labelKey: 'historyFilterThisWeek' },
        { key: 'month', labelKey: 'historyFilterThisMonth' },
        { key: 'custom', labelKey: 'walletTxDateCustom' },
    ];

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 pb-24">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-dark-card">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">{t(titleKey)}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2">
                    {presets.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() =>
                                setDraft((prev) => ({
                                    ...prev,
                                    preset: item.key,
                                    ...(item.key !== 'custom' ? { startDate: '', endDate: '' } : {}),
                                }))
                            }
                            className={`rounded-xl py-2 text-sm font-bold ${
                                draft.preset === item.key
                                    ? 'bg-ghana-green text-white'
                                    : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200'
                            }`}
                        >
                            {t(item.labelKey)}
                        </button>
                    ))}
                </div>

                {draft.preset === 'custom' ? (
                    <div className="mb-4 space-y-3">
                        <GhanaDatePickerField
                            label={t('walletTxDateFrom')}
                            value={draft.startDate}
                            onChange={(startDate) =>
                                setDraft((prev) => {
                                    const next = { ...prev, startDate };
                                    const start = dateFromIsoYmd(startDate);
                                    const end = prev.endDate ? dateFromIsoYmd(prev.endDate) : null;
                                    if (start && end && end.getTime() < start.getTime()) {
                                        next.endDate = '';
                                    }
                                    return next;
                                })
                            }
                        />
                        <GhanaDatePickerField
                            label={t('walletTxDateTo')}
                            value={draft.endDate}
                            min={draft.startDate ? dateFromIsoYmd(draft.startDate) ?? undefined : undefined}
                            onChange={(endDate) => setDraft((prev) => ({ ...prev, endDate }))}
                        />
                    </div>
                ) : null}

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            const reset = defaultTxDateFilter();
                            setDraft(reset);
                            onApply(reset);
                            onClose();
                        }}
                        className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 dark:border-slate-700 dark:text-slate-200"
                    >
                        {t('commonReset')}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onApply(draft);
                            onClose();
                        }}
                        className="flex-[2] rounded-xl bg-ghana-green py-3 text-sm font-black text-white"
                    >
                        {t('commonApply')}
                    </button>
                </div>
            </div>
        </div>
    );
}

/** @deprecated Use DateRangeFilterSheet */
export const TransactionDateFilterSheet = DateRangeFilterSheet;
