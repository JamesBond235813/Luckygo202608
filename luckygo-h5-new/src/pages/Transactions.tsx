import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppPageNav } from '../components/AppPageNav';
import { TransactionFilterSheet } from '../components/wallet/TransactionFilterSheet';
import { TransactionHistoryPanel } from '../components/wallet/TransactionHistoryPanel';
import { defaultTxListFilter, isTxListFilterActive, type TxListFilter } from '../lib/tx-list-filter';
import { useI18n } from '../lib/useI18n';
import { isH5Authenticated } from '../lib/auth';
import { AuthEmptyState } from '../components/AuthEmptyState';
import { showSimpleToast } from '../lib/simpleToast';

const navIconBtnClass =
    'flex size-10 items-center justify-center rounded-full transition-colors hover:bg-gray-50 dark:hover:bg-slate-800';

const Transactions: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const [filterOpen, setFilterOpen] = useState(false);
    const [listFilter, setListFilter] = useState<TxListFilter>(defaultTxListFilter);

    const filterActive = isTxListFilterActive(listFilter);
    const isLoggedIn = isH5Authenticated();

    return (
        <div className="flex min-h-screen flex-col bg-gray-100 pb-10 font-display text-gray-900 transition-colors dark:bg-dark-surface dark:text-slate-100">
            <AppPageNav
                title={
                    <span className="inline-flex max-w-full items-center justify-center gap-0.5">
                        <span className="truncate">{t('walletTxHistory')}</span>
                        <button
                            type="button"
                            onClick={() => showSimpleToast(t('walletTxListHint'))}
                            className="flex size-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-ghana-green dark:hover:bg-slate-800 dark:hover:text-primary"
                            aria-label={t('walletTxListHint')}
                        >
                            <span className="material-symbols-outlined text-[18px]">touch_app</span>
                        </button>
                    </span>
                }
                onBack={() => navigate('/wallet')}
                right={
                    <button
                        type="button"
                        onClick={() => setFilterOpen(true)}
                        className={`relative ${navIconBtnClass}`}
                        aria-label={t('walletTxFilter')}
                    >
                        <span
                            className={`material-symbols-outlined text-[24px] ${
                                filterActive
                                    ? 'text-ghana-green dark:text-primary'
                                    : 'text-gray-700 dark:text-slate-400'
                            }`}
                        >
                            filter_list
                        </span>
                        {filterActive ? (
                            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-ghana-green ring-2 ring-white dark:ring-dark-card" />
                        ) : null}
                    </button>
                }
            />
            <div className="flex-1 px-4 pt-4">
                {isLoggedIn ? (
                    <TransactionHistoryPanel listFilter={listFilter} />
                ) : (
                    <AuthEmptyState from="/transactions" />
                )}
            </div>
            <TransactionFilterSheet
                open={filterOpen}
                value={listFilter}
                onClose={() => setFilterOpen(false)}
                onApply={setListFilter}
            />
        </div>
    );
};

export default Transactions;
