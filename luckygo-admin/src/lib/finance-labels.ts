import type { FinanceRecord } from '../types';
import type { TranslationKey } from './i18n';

const currency = (value: number) =>
    `₵${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TX_TYPE_KEYS: Record<string, TranslationKey> = {
    Recharge: 'txTypeRecharge',
    Spend: 'txTypeSpend',
    Withdraw: 'txTypeWithdraw',
    Reward: 'txTypeReward',
    BeanExchange: 'txTypeBeanExchange',
};

export const txTypeLabel = (type: string, t: (k: TranslationKey) => string) => {
    const key = TX_TYPE_KEYS[type];
    return key ? t(key) : type;
};

export const formatTxMethod = (
    method: string | null | undefined,
    t: (k: TranslationKey) => string,
    tf: (k: TranslationKey, vars?: Record<string, string | number>) => string,
    asset?: string | null,
) => {
    const m = String(method ?? '').trim();
    if (!m) return '-';
    if (/^hubtel/i.test(m)) return t('txMethodHubtel');

    const exactMap: Record<string, TranslationKey> = {
        invite_signup_invitee: 'txMethodInviteSignupInvitee',
        invite_signup_inviter: 'txMethodInviteSignupInviter',
        invite_spend: 'txMethodInviteSpend',
        beans_to_exchange: 'txMethodBeansToExchange',
    };
    if (exactMap[m]) return t(exactMap[m]);

    if (m === 'Balance' || m === 'balance') {
        return asset === 'exchange' ? t('txMethodExchangeBalance') : t('txMethodWithdrawableBalance');
    }

    const balancePart = /^balance_part:(\d+(?:\.\d+)?)$/i.exec(m);
    if (balancePart) {
        return tf('txMethodBalancePart', { part: balancePart[1] });
    }

    return m;
};

const isBeanAmountRow = (row: FinanceRecord) => {
    if (row.type === 'Reward') return true;
    if (row.type === 'BeanExchange' && row.asset === 'beans') return true;
    if (row.asset === 'beans' && row.beans_amount != null && Number(row.beans_amount) !== 0) return true;
    return false;
};

export const formatTxAmountText = (row: FinanceRecord, t: (k: TranslationKey) => string) => {
    if (isBeanAmountRow(row)) {
        const beans = Number(row.beans_amount) || 0;
        if (beans === 0) return '-';
        const signed = beans;
        const prefix = signed > 0 ? '+' : signed < 0 ? '-' : '';
        return `${prefix}${Math.abs(signed).toLocaleString()} ${t('unitBeans')}`;
    }

    const n = Number(row.amount) || 0;
    if (n === 0 && row.type !== 'BeanExchange') return currency(0);

    const isOut = row.type === 'Spend' || row.type === 'Withdraw';
    const signed = isOut ? -Math.abs(n) : Math.abs(n);
    const prefix = signed > 0 ? '+' : signed < 0 ? '-' : '';
    return `${prefix}${currency(Math.abs(signed))}`;
};

export const txAmountColor = (row: FinanceRecord) => {
    if (isBeanAmountRow(row)) {
        const beans = Number(row.beans_amount) || 0;
        if (beans > 0) return '#389e0d';
        if (beans < 0) return '#cf1322';
        return undefined;
    }
    const n = Number(row.amount) || 0;
    const isOut = row.type === 'Spend' || row.type === 'Withdraw';
    const signed = isOut ? -Math.abs(n) : Math.abs(n);
    if (signed < 0) return '#cf1322';
    if (signed > 0) return '#389e0d';
    return undefined;
};
