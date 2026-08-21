import { formatCurrency, txTypeLabel } from './localization';
import type { Transaction } from '../types';

export type TxAssetKind = 'balance' | 'exchange' | 'beans';

export function normalizeTxAsset(tx: Transaction): TxAssetKind {
    const raw = String(tx.asset ?? '').toLowerCase();
    if (raw === 'exchange' || raw === 'beans' || raw === 'balance') return raw;
    if (tx.type === 'Spend') return 'exchange';
    if (resolveTxType(tx) === 'BeanExchange' || (tx.beansAmount != null && tx.beansAmount !== 0)) {
        return 'beans';
    }
    return 'balance';
}

/** 库内支出多为正数，展示时按类型与资产转为带符号金额 */
export function normalizeTxDisplayAmount(tx: Transaction): { signed: number; isIncome: boolean } {
    const asset = normalizeTxAsset(tx);
    if (asset === 'beans') {
        const beans = Number(tx.beansAmount ?? 0);
        return { signed: beans, isIncome: beans > 0 };
    }
    const amount = Number(tx.amount) || 0;
    const abs = Math.abs(amount);
    if (tx.type === 'Recharge' || tx.type === 'Reward') return { signed: abs, isIncome: true };
    if (tx.type === 'Spend' || tx.type === 'Withdraw') return { signed: -abs, isIncome: false };
    if (resolveTxType(tx) === 'BeanExchange') {
        if (asset === 'exchange') {
            return { signed: abs, isIncome: true };
        }
        return { signed: -Math.abs(Number(tx.beansAmount ?? 0)), isIncome: false };
    }
    return { signed: amount, isIncome: amount > 0 };
}

export function formatSignedTxAmount(tx: Transaction) {
    const asset = normalizeTxAsset(tx);
    const { signed, isIncome } = normalizeTxDisplayAmount(tx);
    const prefix = isIncome ? '+' : signed < 0 ? '-' : '';

    if (asset === 'beans') {
        const beans = Math.abs(Number(tx.beansAmount ?? signed));
        return {
            signed,
            isIncome,
            asset,
            text: `${prefix}${beans.toLocaleString()}`,
            unit: 'beans' as const,
        };
    }

    const abs = Math.abs(signed);
    return {
        signed,
        isIncome,
        asset,
        text: `${prefix}${formatCurrency(abs)}`,
        unit: 'currency' as const,
    };
}

export function txAssetLabel(asset: TxAssetKind, t: (key: string) => string): string {
    if (asset === 'exchange') return t('walletAssetExchange');
    if (asset === 'beans') return t('walletAssetBeans');
    return t('walletAssetBalance');
}

/** 列表旁小标签：余额扣款、在线支付不展示，避免与标题重复 */
export function shouldShowTxMethodBadge(method: string | undefined): boolean {
    const m = method?.trim() ?? '';
    if (!m) return false;
    if (/^balance$/i.test(m)) return false;
    if (/^hubtel/i.test(m)) return false;
    if (/^balance_part:/i.test(m)) return false;
    if (/^beans_to_exchange/i.test(m)) return false;
    if (/^invite_/i.test(m)) return false;
    return true;
}

const INVITE_TX_METHOD_I18N: Record<string, string> = {
    invite_signup_inviter: 'walletTxInviteSignupInviter',
    invite_signup_invitee: 'walletTxInviteSignupInvitee',
    invite_spend: 'walletTxInviteSpend',
};

const TX_METHOD_I18N: Record<string, string> = {
    beans_to_exchange: 'walletTxMethodBeansToExchange',
};

export function isBeansToExchangeMethod(method: string | undefined): boolean {
    return /^beans_to_exchange/i.test(method?.trim() ?? '');
}

const TX_TYPES: Transaction['type'][] = ['Recharge', 'Spend', 'Withdraw', 'Reward', 'BeanExchange'];

/** DB enum 曾不含 BeanExchange 时 type 可能为空，按 method 推断 */
export function resolveTxType(tx: Pick<Transaction, 'type' | 'method'>): Transaction['type'] {
    const raw = String(tx.type ?? '').trim() as Transaction['type'];
    if (TX_TYPES.includes(raw)) return raw;
    if (isBeansToExchangeMethod(tx.method)) return 'BeanExchange';
    return raw;
}

/** 邀请有礼等金豆流水：将 invite_* 内部标识转为可读文案 */
export function formatInviteTxMethod(method: string | undefined, t: (key: string) => string): string | null {
    const m = method?.trim().toLowerCase() ?? '';
    const key = INVITE_TX_METHOD_I18N[m];
    return key ? t(key) : null;
}

export function isInviteTxMethod(method: string | undefined): boolean {
    const m = method?.trim().toLowerCase() ?? '';
    return m in INVITE_TX_METHOD_I18N;
}

export function formatTxTypeLabel(tx: Transaction, t: (key: string) => string): string {
    if (isInviteTxMethod(tx.method)) return t('txTypeInviteRewards');
    return txTypeLabel(resolveTxType(tx), t);
}

export function formatKnownTxMethod(method: string | undefined, t: (key: string) => string): string | null {
    const m = method?.trim().toLowerCase() ?? '';
    const invite = formatInviteTxMethod(method, t);
    if (invite) return invite;
    const key = TX_METHOD_I18N[m];
    return key ? t(key) : null;
}

export function formatTxMethod(method: string | undefined, t: (key: string) => string): string {
    const m = method?.trim() ?? '';
    const known = formatKnownTxMethod(m, t);
    if (known) return known;
    if (!m || /^balance$/i.test(m)) return t('walletMethodWalletPay');
    if (/^hubtel/i.test(m)) return t('walletMethodOnlinePay');
    const balancePart = m.match(/^balance_part:([\d.]+)/i);
    if (balancePart) {
        return tf(t, 'walletMethodSpendBalancePart', { amount: balancePart[1] });
    }
    return m;
}

function tf(t: (key: string) => string, key: string, vars: Record<string, string>) {
    let s = t(key);
    for (const [k, v] of Object.entries(vars)) {
        s = s.split(`{${k}}`).join(v);
    }
    return s;
}

export function formatTxListTitle(tx: Transaction, t: (key: string) => string): string {
    const invite = formatInviteTxMethod(tx.method, t);
    if (invite) return invite;
    return formatTxTypeLabel(tx, t);
}

export function formatTxDetailExtra(tx: Transaction, t: (key: string) => string): string | null {
    const invite = formatInviteTxMethod(tx.method, t);
    if (invite) return invite;

    const asset = normalizeTxAsset(tx);
    if (isBeansToExchangeMethod(tx.method)) return null;
    const m = tx.method?.trim() ?? '';
    const balancePart = m.match(/^balance_part:([\d.]+)/i);
    if (asset === 'exchange' && balancePart) {
        return tf(t, 'walletMethodSpendBalancePart', { amount: balancePart[1] });
    }
    return null;
}

export function matchesTxAssetTab(tx: Transaction, tab: 'all' | TxAssetKind): boolean {
    if (tab === 'all') return true;
    return normalizeTxAsset(tx) === tab;
}

export function matchesTxFlowTab(
    tx: Transaction,
    tab: 'all' | 'income' | 'expenses',
): boolean {
    if (tab === 'all') return true;
    const { isIncome } = normalizeTxDisplayAmount(tx);
    if (tab === 'income') return isIncome;
    if (tab === 'expenses') return !isIncome;
    return true;
}
