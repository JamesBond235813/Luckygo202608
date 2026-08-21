import {
    defaultTxDateFilter,
    isTxDateFilterActive,
    type TxDateFilter,
} from './tx-date-filter';
import type { TxAssetKind } from './wallet-tx';

export type TxAssetFilterTab = 'all' | TxAssetKind;

export type TxListFilter = {
    date: TxDateFilter;
    asset: TxAssetFilterTab;
};

export const defaultTxListFilter = (): TxListFilter => ({
    date: defaultTxDateFilter(),
    asset: 'all',
});

export function isTxListFilterActive(filter: TxListFilter): boolean {
    return isTxDateFilterActive(filter.date) || filter.asset !== 'all';
}
