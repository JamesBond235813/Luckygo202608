import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiService } from '../../services/api';
import { logUnexpectedApiError } from '../../lib/api-response';
import { txStatusColorClass, txStatusLabel } from '../../lib/localization';
import { matchesTxDateFilter } from '../../lib/tx-date-filter';
import type { TxListFilter } from '../../lib/tx-list-filter';
import {
    formatSignedTxAmount,
    formatTxDetailExtra,
    formatTxListTitle,
    formatTxMethod,
    formatTxTypeLabel,
    resolveTxType,
    matchesTxAssetTab,
    matchesTxFlowTab,
    normalizeTxAsset,
    txAssetLabel,
} from '../../lib/wallet-tx';
import { useI18n } from '../../lib/useI18n';
import type { Transaction } from '../../types';
import { SegmentTabBar } from '../SegmentTabBar';
import { WalletInfoRow, WalletSheet } from './WalletSheet';

type FlowTab = 'all' | 'income' | 'expenses';

type Props = {
    listFilter?: TxListFilter;
};

function txTypeIcon(type: Transaction['type']): string {
    if (type === 'Recharge') return 'payments';
    if (type === 'Spend') return 'confirmation_number';
    if (type === 'Withdraw') return 'account_balance';
    if (type === 'BeanExchange') return 'currency_exchange';
    return 'redeem';
}

function txTypeColorClass(type: Transaction['type']): string {
    if (type === 'Recharge') return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30';
    if (type === 'Spend') return 'bg-orange-50 text-orange-600 dark:bg-orange-950/30';
    if (type === 'Withdraw') return 'bg-amber-50 text-amber-600 dark:bg-amber-950/30';
    if (type === 'BeanExchange') return 'bg-violet-50 text-violet-600 dark:bg-violet-950/30';
    return 'bg-blue-50 text-blue-600 dark:bg-blue-950/30';
}

export function TransactionHistoryPanel({ listFilter }: Props) {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<FlowTab>('all');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const txData = await ApiService.getUserTransactions();
            setTransactions(txData);
        } catch (error) {
            logUnexpectedApiError(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter((tx) => {
            if (listFilter && !matchesTxDateFilter(tx, listFilter.date)) return false;
            if (listFilter && !matchesTxAssetTab(tx, listFilter.asset)) return false;
            return matchesTxFlowTab(tx, activeTab);
        });
    }, [transactions, activeTab, listFilter]);

    const hasAnyTransactions = transactions.length > 0;
    const emptyByDateOrTab = hasAnyTransactions && filteredTransactions.length === 0;

    const flowTabs = [
        { key: 'all' as const, labelKey: 'walletTabAll' },
        { key: 'income' as const, labelKey: 'walletTabIncome' },
        { key: 'expenses' as const, labelKey: 'walletTabExpenses' },
    ] as const;

    return (
        <>
            <SegmentTabBar
                tabs={flowTabs.map((tab) => ({ key: tab.key, label: t(tab.labelKey) }))}
                value={activeTab}
                onChange={setActiveTab}
            />

            {loading ? (
                <p className="py-12 text-center text-sm text-gray-500">{t('commonLoading')}</p>
            ) : filteredTransactions.length > 0 ? (
                <div className="space-y-3">
                    {filteredTransactions.map((tx) => {
                        const amountDisplay = formatSignedTxAmount(tx);
                        return (
                            <button
                                key={tx.id}
                                type="button"
                                onClick={() => setSelectedTransaction(tx)}
                                className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all active:scale-[0.99] hover:shadow-md dark:border-slate-800 dark:bg-dark-card"
                            >
                                <div className="flex min-w-0 items-center gap-4">
                                    <div
                                        className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${txTypeColorClass(resolveTxType(tx))}`}
                                    >
                                        <span className="material-symbols-outlined text-2xl filled">
                                            {txTypeIcon(resolveTxType(tx))}
                                        </span>
                                    </div>
                                    <div className="flex min-w-0 flex-col gap-0.5">
                                        <p className="line-clamp-1 text-base font-bold text-gray-900 dark:text-slate-100">
                                            {formatTxListTitle(tx, t)}
                                        </p>
                                        <p className="line-clamp-1 text-xs font-medium text-gray-500 dark:text-slate-500">
                                            {tx.timestamp}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1 pl-2">
                                    <div className="flex items-baseline gap-1">
                                        <span
                                            className={`text-lg font-black tracking-tight ${
                                                amountDisplay.isIncome
                                                    ? 'text-emerald-600'
                                                    : 'text-rose-600 dark:text-rose-400'
                                            }`}
                                        >
                                            {amountDisplay.text}
                                        </span>
                                        {amountDisplay.unit === 'beans' ? (
                                            <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
                                                {t('walletUnitBeans')}
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span
                                            className={`size-1.5 rounded-full ${
                                                tx.status === 'Success'
                                                    ? 'bg-emerald-500'
                                                    : 'bg-amber-500 animate-pulse'
                                            }`}
                                        />
                                        <span
                                            className={`text-[10px] font-bold uppercase tracking-widest ${
                                                tx.status === 'Success'
                                                    ? 'text-emerald-500'
                                                    : 'text-amber-500'
                                            }`}
                                        >
                                            {txStatusLabel(tx.status, t)}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                    <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-gray-50 dark:bg-slate-800/50">
                        <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-slate-700">
                            history_toggle_off
                        </span>
                    </div>
                    <h4 className="mb-1 font-bold text-gray-900 dark:text-slate-200">
                        {emptyByDateOrTab ? t('walletNoTransactionsInRange') : t('walletNoTransactions')}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-slate-500">{t('walletNoTransactionsHint')}</p>
                </div>
            )}

            {selectedTransaction ? (
                <WalletSheet title={t('walletTxDetails')} onClose={() => setSelectedTransaction(null)}>
                    <div className="space-y-3 text-sm">
                        <WalletInfoRow
                            label={t('walletLabelType')}
                            value={formatTxTypeLabel(selectedTransaction, t)}
                        />
                        <WalletInfoRow
                            label={t('walletLabelAsset')}
                            value={txAssetLabel(normalizeTxAsset(selectedTransaction), t)}
                        />
                        <WalletInfoRow
                            label={t('walletLabelAmount')}
                            value={(() => {
                                const d = formatSignedTxAmount(selectedTransaction);
                                return d.unit === 'beans'
                                    ? `${d.text} ${t('walletUnitBeans')}`
                                    : d.text;
                            })()}
                        />
                        {formatTxDetailExtra(selectedTransaction, t) ? (
                            <WalletInfoRow
                                label={t('walletLabelMethod')}
                                value={formatTxDetailExtra(selectedTransaction, t)!}
                            />
                        ) : (
                            <WalletInfoRow
                                label={t('walletLabelMethod')}
                                value={formatTxMethod(selectedTransaction.method, t)}
                            />
                        )}
                        <WalletInfoRow
                            label={t('walletLabelStatus')}
                            value={txStatusLabel(selectedTransaction.status, t)}
                            valueClassName={txStatusColorClass(selectedTransaction.status)}
                        />
                        <WalletInfoRow
                            label={t('walletLabelTime')}
                            value={selectedTransaction.timestamp || '--'}
                        />
                    </div>
                </WalletSheet>
            ) : null}
        </>
    );
}
