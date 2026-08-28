import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/useI18n';
import { tf } from '../lib/localization';
import { promptLogin } from '../lib/require-login';
import type { InviteMyRewards, InviteMyRewardsInvitee } from '../types';

type RewardsTab = 'invites' | 'rebates';

type InviteMyRewardsPanelProps = {
    isLoggedIn: boolean;
    loading: boolean;
    data: InviteMyRewards | null;
    onRefresh: () => void;
};

const rewardAmountClass = 'text-sm font-normal tabular-nums text-primary';

const SignupRewardListItem: React.FC<{
    item: InviteMyRewardsInvitee;
    t: (key: string) => string;
    tf: typeof tf;
}> = ({ item, t, tf }) => (
    <li className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/40">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ghana-green/10 text-sm font-bold text-ghana-green">
            {item.isSelf ? (
                <span className="material-symbols-outlined text-[20px]">person</span>
            ) : (
                (item.nickname || '?')[0]
            )}
        </div>
        <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">
                {item.isSelf ? t('inviteMyRewardsSelfTitle') : item.nickname || '-'}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-slate-400">
                {item.isSelf
                    ? tf(t, 'inviteMyRewardsSelfInviter', { name: item.nickname || '-' })
                    : `${item.phoneMasked}${item.registeredAt ? ` · ${item.registeredAt}` : ''}`}
            </p>
        </div>
        <p className={rewardAmountClass}>+{item.signupRewardBeans.toLocaleString()}</p>
    </li>
);

const SpendRebateListItem: React.FC<{ item: InviteMyRewardsInvitee }> = ({ item }) => (
    <li className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/40">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ghana-green/10 text-sm font-bold text-ghana-green">
            {(item.nickname || '?')[0]}
        </div>
        <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">
                {item.nickname || '-'}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-slate-400">
                {item.phoneMasked}
                {item.registeredAt ? ` · ${item.registeredAt}` : ''}
            </p>
        </div>
        <p className={rewardAmountClass}>+{item.spendRewardBeans.toLocaleString()}</p>
    </li>
);

export const InviteMyRewardsPanel: React.FC<InviteMyRewardsPanelProps> = ({
    isLoggedIn,
    loading,
    data,
    onRefresh,
}) => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<RewardsTab>('invites');

    const signupRewardEntries = useMemo(
        () => (data?.invitees ?? []).filter((item) => item.signupRewardBeans > 0),
        [data?.invitees],
    );

    const spendRebateEntries = useMemo(
        () => (data?.invitees ?? []).filter((item) => !item.isSelf && item.spendRewardBeans > 0),
        [data?.invitees],
    );

    if (!isLoggedIn) {
        return (
            <div className="rounded-xl bg-gray-50 px-4 py-6 text-center dark:bg-slate-800/50">
                <p className="text-sm text-gray-600 dark:text-slate-400">{t('inviteMyRewardsLoginHint')}</p>
                <button
                    type="button"
                    onClick={() => { promptLogin(navigate, t('authLoginRequired'), '/invite', 0); }}
                    className="mt-3 rounded-lg bg-ghana-green px-5 py-2 text-xs font-black text-white active:scale-95"
                >
                    {t('inviteGetCodeCta')}
                </button>
            </div>
        );
    }

    if (loading && !data) {
        return <p className="py-8 text-center text-sm text-gray-500">{t('commonLoading')}</p>;
    }

    const signupTotal = data?.signupRewardBeans ?? 0;
    const spendTotal = data?.spendRewardBeans ?? 0;

    return (
        <>
            <div className="mb-3 flex justify-end">
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={loading}
                    className="flex items-center gap-0.5 text-xs font-semibold text-gray-500 active:opacity-70 dark:text-slate-400"
                >
                    <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
                        refresh
                    </span>
                    {t('inviteMyRewardsRefresh')}
                </button>
            </div>
            <div className="mt-1 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-ghana-green/5 px-2 py-2.5 text-center dark:bg-ghana-green/10">
                    <p className="text-lg font-black tabular-nums text-ghana-green">{data?.inviteCount ?? 0}</p>
                    <p className="mt-0.5 text-[10px] font-semibold text-gray-500 dark:text-slate-400">
                        {t('inviteMyRewardsInviteCount')}
                    </p>
                </div>
                <div className="rounded-xl bg-ghana-green/5 px-2 py-2.5 text-center dark:bg-ghana-green/10">
                    <p className="text-lg font-black tabular-nums text-ghana-green">{signupTotal.toLocaleString()}</p>
                    <p className="mt-0.5 text-[10px] font-semibold text-gray-500 dark:text-slate-400">
                        {t('inviteMyRewardsTabInvites')}
                    </p>
                </div>
                <div className="rounded-xl bg-ghana-green/5 px-2 py-2.5 text-center dark:bg-ghana-green/10">
                    <p className="text-lg font-black tabular-nums text-ghana-green">{spendTotal.toLocaleString()}</p>
                    <p className="mt-0.5 text-[10px] font-semibold text-gray-500 dark:text-slate-400">
                        {t('inviteMyRewardsTabRebates')}
                    </p>
                </div>
            </div>
            <p className="mt-3 text-center text-xs text-gray-600 dark:text-slate-400">
                {tf(t, 'inviteMyRewardsTotal', { beans: String(data?.totalRewardBeans ?? 0) })}
            </p>

            <div className="mt-4 border-b border-gray-100 dark:border-slate-700">
                <div className="flex">
                    {(
                        [
                            { id: 'invites' as const, label: t('inviteMyRewardsTabInvites') },
                            { id: 'rebates' as const, label: t('inviteMyRewardsTabRebates') },
                        ] as const
                    ).map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className="relative flex flex-1 flex-col items-center justify-center pb-3 pt-1"
                        >
                            <p
                                className={`text-sm ${
                                    activeTab === tab.id
                                        ? 'font-bold text-gray-900 dark:text-slate-100'
                                        : 'font-medium text-gray-400 dark:text-slate-500'
                                }`}
                            >
                                {tab.label}
                            </p>
                            {activeTab === tab.id ? (
                                <div className="absolute bottom-0 h-[3px] w-10 rounded-full bg-primary" />
                            ) : null}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-3">
                {activeTab === 'invites' ? (
                    <>
                        {!signupRewardEntries.length ? (
                            <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-xs text-gray-500 dark:border-slate-600 dark:text-slate-400">
                                {t('inviteMyRewardsEmpty')}
                            </p>
                        ) : (
                            <ul className="max-h-52 space-y-2 overflow-y-auto">
                                {signupRewardEntries.map((item) => (
                                    <SignupRewardListItem
                                        key={item.isSelf ? 'self-signup' : `${item.phoneMasked}-${item.registeredAt}`}
                                        item={item}
                                        t={t}
                                        tf={tf}
                                    />
                                ))}
                            </ul>
                        )}
                    </>
                ) : !spendRebateEntries.length ? (
                            <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-xs text-gray-500 dark:border-slate-600 dark:text-slate-400">
                                {t('inviteMyRewardsRebatesEmpty')}
                            </p>
                ) : (
                    <ul className="max-h-52 space-y-2 overflow-y-auto">
                        {spendRebateEntries.map((item) => (
                            <SpendRebateListItem
                                key={`${item.phoneMasked}-${item.registeredAt}`}
                                item={item}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
};
