import { useEffect, useState } from 'react';
import { dateFromIsoYmd } from '../../lib/ghana-datetime';
import {
    defaultTxListFilter,
    type TxAssetFilterTab,
    type TxListFilter,
} from '../../lib/tx-list-filter';
import type { TxDatePreset } from '../../lib/tx-date-filter';
import { useI18n } from '../../lib/useI18n';
import { GhanaDatePickerField } from './GhanaDatePickerField';

type Props = {
    open: boolean;
    value: TxListFilter;
    onClose: () => void;
    onApply: (next: TxListFilter) => void;
};

const assetTabs: { key: TxAssetFilterTab; labelKey: string }[] = [
    { key: 'all', labelKey: 'walletTabAll' },
    { key: 'balance', labelKey: 'walletAssetBalance' },
    { key: 'exchange', labelKey: 'walletTxFilterAssetExchange' },
    { key: 'beans', labelKey: 'walletAssetBeans' },
];

export function TransactionFilterSheet({ open, value, onClose, onApply }: Props) {
    const { t } = useI18n();
    const [draft, setDraft] = useState<TxListFilter>(value);

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
            <div className="max-h-[min(32rem,85vh)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-dark-card">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">{t('walletTxFilter')}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <p className="mb-2 text-xs font-bold text-gray-500 dark:text-slate-400">{t('walletTxFilterAsset')}</p>
                <div className="mb-4 grid grid-cols-2 gap-2">
                    {assetTabs.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => setDraft((prev) => ({ ...prev, asset: item.key }))}
                            className={`rounded-xl py-2.5 text-sm font-bold ${
                                draft.asset === item.key
                                    ? 'bg-ghana-green text-white'
                                    : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200'
                            }`}
                        >
                            {t(item.labelKey)}
                        </button>
                    ))}
                </div>

                <p className="mb-2 text-xs font-bold text-gray-500 dark:text-slate-400">{t('walletTxFilterDate')}</p>
                <div className="mb-4 grid grid-cols-2 gap-2">
                    {presets.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() =>
                                setDraft((prev) => ({
                                    ...prev,
                                    date: {
                                        ...prev.date,
                                        preset: item.key,
                                        ...(item.key !== 'custom' ? { startDate: '', endDate: '' } : {}),
                                    },
                                }))
                            }
                            className={`rounded-xl py-2 text-sm font-bold ${
                                draft.date.preset === item.key
                                    ? 'bg-ghana-green text-white'
                                    : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200'
                            }`}
                        >
                            {t(item.labelKey)}
                        </button>
                    ))}
                </div>

                {draft.date.preset === 'custom' ? (
                    <div className="mb-4 space-y-3">
                        <GhanaDatePickerField
                            label={t('walletTxDateFrom')}
                            value={draft.date.startDate}
                            onChange={(startDate) =>
                                setDraft((prev) => {
                                    const nextDate = { ...prev.date, startDate };
                                    const start = dateFromIsoYmd(startDate);
                                    const end = prev.date.endDate ? dateFromIsoYmd(prev.date.endDate) : null;
                                    if (start && end && end.getTime() < start.getTime()) {
                                        nextDate.endDate = '';
                                    }
                                    return { ...prev, date: nextDate };
                                })
                            }
                        />
                        <GhanaDatePickerField
                            label={t('walletTxDateTo')}
                            value={draft.date.endDate}
                            min={draft.date.startDate ? dateFromIsoYmd(draft.date.startDate) ?? undefined : undefined}
                            onChange={(endDate) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    date: { ...prev.date, endDate },
                                }))
                            }
                        />
                    </div>
                ) : null}

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            const reset = defaultTxListFilter();
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
