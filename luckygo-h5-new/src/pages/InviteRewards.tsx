import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildInviteRewardCopy } from '../lib/invite-rewards-copy';
import { tf } from '../lib/localization';
import { useI18n } from '../lib/useI18n';
import { useInviteRewardsConfig } from '../hooks/useInviteRewardsConfig';
import { useUserProfile } from '../context/UserProfileContext';
import { isH5Authenticated } from '../lib/auth';
import { promptLogin } from '../lib/require-login';
import { showSimpleToast } from '../lib/simpleToast';
import { ApiService } from '../services/api';
import type { InviteMyRewards } from '../types';
import { AppPageNav, APP_PAGE_NAV_DEFAULT_HEIGHT } from '../components/AppPageNav';
import { InviteBeansRichText } from '../components/InviteBeansRichText';
import { InviteMyRewardsPanel } from '../components/InviteMyRewardsPanel';

const NAV_TOP = `calc(${APP_PAGE_NAV_DEFAULT_HEIGHT} + 0.5rem)`;

const inviteSideFloatClass =
    'flex flex-col items-center gap-1.5 rounded-l-xl border border-r-0 border-ghana-green/25 bg-white/95 px-2 py-3 text-xs font-bold text-ghana-green shadow-md shadow-ghana-green/10 backdrop-blur-sm transition active:scale-95 dark:border-ghana-green/30 dark:bg-dark-card/95';

const InviteRewards: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const { user, refreshUser } = useUserProfile();
    const isLoggedIn = isH5Authenticated();
    const [copyPulse, setCopyPulse] = useState(false);
    const [rulesOpen, setRulesOpen] = useState(false);
    const [myRewardsOpen, setMyRewardsOpen] = useState(false);
    const [myRewards, setMyRewards] = useState<InviteMyRewards | null>(null);
    const [myRewardsLoading, setMyRewardsLoading] = useState(false);
    const { config: inviteConfig, highlightNumbers } = useInviteRewardsConfig();
    const inviteCopy = useMemo(() => buildInviteRewardCopy(inviteConfig, t), [inviteConfig, t]);

    useEffect(() => {
        if (isLoggedIn) void refreshUser();
    }, [isLoggedIn, refreshUser]);

    const loadMyRewards = useCallback(async () => {
        if (!isLoggedIn) {
            setMyRewards(null);
            return;
        }
        setMyRewardsLoading(true);
        try {
            setMyRewards(await ApiService.getMyInviteRewards());
        } catch {
            setMyRewards(null);
        } finally {
            setMyRewardsLoading(false);
        }
    }, [isLoggedIn]);

    const openMyRewards = useCallback(() => {
        setMyRewardsOpen(true);
        void loadMyRewards();
    }, [loadMyRewards]);

    const inviteCode = user?.inviteCode?.trim() || '';

    const registerLink = useMemo(() => {
        if (typeof window === 'undefined' || !inviteCode) return '';
        const base = `${window.location.origin}/login`;
        return `${base}?invite=${encodeURIComponent(inviteCode)}`;
    }, [inviteCode]);

    /** 复制分享链接时附带吸引文案 + 邀请码 + 注册链接 */
    const shareLinkCopyText = useMemo(() => {
        if (!registerLink || !inviteCode) return '';
        return tf(t, 'inviteCopyLinkTextTemplate', {
            code: inviteCode,
            link: registerLink,
            inviterBeans: inviteConfig.signupInviterBeans,
            inviteeBeans: inviteConfig.signupInviteeBeans,
        });
    }, [inviteCode, registerLink, inviteConfig.signupInviterBeans, inviteConfig.signupInviteeBeans, t]);

    const copyText = useCallback(
        async (text: string, toastKey: string) => {
            if (!text) {
                promptLogin(navigate, t('authLoginRequired'), '/invite');
                return;
            }
            try {
                await navigator.clipboard.writeText(text);
                setCopyPulse(true);
                window.setTimeout(() => setCopyPulse(false), 600);
                showSimpleToast(t(toastKey));
            } catch {
                showSimpleToast(t('inviteCopyFailed'));
            }
        },
        [navigate, t],
    );

    const steps = [
        { icon: 'share', title: t('inviteStep1Title'), desc: t('inviteStep1Desc') },
        { icon: 'person_add', title: t('inviteStep2Title'), desc: t('inviteStep2Desc') },
        { icon: 'redeem', title: t('inviteStep3Title'), desc: inviteCopy.step3Desc },
    ];

    const rewards = [
        { id: 'inviter-signup', who: t('inviteRewardInviter'), what: inviteCopy.inviterSignup },
        { id: 'inviter-spend', who: t('inviteRewardInviterSpendTitle'), what: inviteCopy.inviterSpendDetail },
        { id: 'invitee', who: t('inviteRewardInvitee'), what: inviteCopy.inviteeDetail },
    ];

    const beansHint = t('inviteBeansTapHint');

    const rules = [
        t('inviteRule1'),
        t('inviteRule2'),
        t('inviteRule3'),
        t('inviteRule4'),
        t('inviteRule5'),
        t('inviteRule6'),
    ];

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#e8f5ee] via-surface to-[#f4faf6] pb-28 text-gray-900 dark:from-slate-900 dark:via-dark-surface dark:to-slate-900 dark:text-slate-100">
            <div className="pointer-events-none absolute -right-20 top-24 size-56 rounded-full bg-primary/20 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -left-16 top-64 size-48 rounded-full bg-ghana-green/10 blur-3xl" aria-hidden />

            <AppPageNav
                title={<span className="font-black text-ghana-green">{t('invitePageTitle')}</span>}
                onBack={() => navigate(-1)}
            />

            <div className="fixed right-0 z-[55] flex flex-col gap-2" style={{ top: NAV_TOP }}>
                <button
                    type="button"
                    onClick={() => setRulesOpen(true)}
                    className={inviteSideFloatClass}
                    aria-label={t('inviteRulesTitle')}
                >
                    <span className="material-symbols-outlined text-[18px] leading-none">gavel</span>
                    <span className="[writing-mode:vertical-rl] tracking-[0.2em]">{t('inviteRulesFloat')}</span>
                </button>
                <button
                    type="button"
                    onClick={openMyRewards}
                    className={inviteSideFloatClass}
                    aria-label={t('inviteMyRewardsTitle')}
                >
                    <span className="material-symbols-outlined text-[18px] leading-none">redeem</span>
                    <span className="[writing-mode:vertical-rl] tracking-[0.2em]">{t('inviteMyRewardsFloat')}</span>
                </button>
            </div>

            <main className="relative z-10 px-4 pt-2">
                {!inviteConfig.enabled ? (
                    <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                        {t('inviteRewardsDisabledNotice')}
                    </div>
                ) : null}
                <article className="overflow-hidden rounded-3xl border border-ghana-green/15 bg-white shadow-lg shadow-ghana-green/10 dark:border-slate-700 dark:bg-dark-card dark:shadow-black/20">
                    <div className="relative bg-gradient-to-r from-ghana-green via-[#00875a] to-[#006b3f] px-6 pb-10 pt-8 text-center">
                        <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/25 blur-2xl" aria-hidden />
                        <div className="mx-auto mb-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                            <span className="material-symbols-outlined text-[14px] filled">celebration</span>
                            {t('invitePosterBadge')}
                        </div>
                        <h2 className="text-3xl font-black leading-tight tracking-tight text-white">
                            {t('invitePosterHeadline')}
                        </h2>
                        <p className="mx-auto mt-3 max-w-[18rem] text-sm leading-relaxed text-white/90">
                            {t('invitePosterSubline')}
                        </p>
                        <div className="mt-7 flex justify-center gap-3">
                            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/20 text-primary shadow-md backdrop-blur-sm">
                                <span className="material-symbols-outlined text-[28px] filled">card_giftcard</span>
                            </span>
                            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15 text-white shadow-md backdrop-blur-sm">
                                <span className="material-symbols-outlined text-[28px] filled">groups</span>
                            </span>
                            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/20 text-primary shadow-md backdrop-blur-sm">
                                <span className="material-symbols-outlined text-[28px] filled">savings</span>
                            </span>
                        </div>
                    </div>

                    <div className="relative -mt-6 mx-4 rounded-2xl border border-primary/25 bg-gradient-to-b from-[#fff9e6] to-white p-4 shadow-md dark:from-slate-800 dark:to-dark-card dark:border-primary/20">
                        <p className="text-center text-[11px] font-bold uppercase tracking-wider text-ghana-green">
                            {t('inviteMyCodeLabel')}
                        </p>
                        {isLoggedIn && inviteCode ? (
                            <button
                                type="button"
                                onClick={() => void copyText(inviteCode, 'inviteCodeCopied')}
                                className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-white py-4 transition active:scale-[0.98] dark:bg-slate-900/50 ${copyPulse ? 'ring-2 ring-primary/50' : ''}`}
                            >
                                <span className="font-mono text-2xl font-black tracking-[0.35em] text-ghana-green">
                                    {inviteCode}
                                </span>
                                <span className="material-symbols-outlined text-[20px] text-ghana-green">content_copy</span>
                            </button>
                        ) : (
                            <div className="mt-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-center dark:border-slate-600 dark:bg-slate-800/50">
                                <p className="text-sm text-gray-600 dark:text-slate-400">{t('inviteCodeLoginHint')}</p>
                                <button
                                    type="button"
                                    onClick={() => { promptLogin(navigate, t('authLoginRequired'), '/invite', 0); }}
                                    className="mt-3 rounded-lg bg-primary px-5 py-2 text-xs font-black text-ghana-green active:scale-95"
                                >
                                    {t('inviteGetCodeCta')}
                                </button>
                            </div>
                        )}
                        <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-500 dark:text-slate-400">
                            {t('inviteCodeFootnote')}
                        </p>
                    </div>

                    <div className="space-y-4 px-4 pb-6 pt-6">
                        <h3 className="text-center text-sm font-black text-ghana-green">{t('inviteHowTitle')}</h3>
                        <div className="space-y-2.5">
                            {steps.map((step, index) => (
                                <div
                                    key={step.title}
                                    className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/40"
                                >
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ghana-green/10 text-sm font-black text-ghana-green">
                                        {index + 1}
                                    </div>
                                    <div className="min-w-0 flex-1 text-left">
                                        <div className="flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[18px] text-ghana-green">{step.icon}</span>
                                            <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{step.title}</p>
                                        </div>
                                        <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-slate-400">
                                            <InviteBeansRichText
                                                text={step.desc}
                                                hint={beansHint}
                                                highlightNumbers={highlightNumbers}
                                            />
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <h3 className="pt-1 text-center text-sm font-black text-ghana-green">{t('inviteRewardTitle')}</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {rewards.map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-xl border border-primary/20 bg-[#fffbeb] p-3 dark:border-primary/15 dark:bg-primary/5"
                                >
                                    <p className="text-xs font-black text-ghana-green">{item.who}</p>
                                    <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-slate-400">
                                        <InviteBeansRichText
                                            text={item.what}
                                            hint={beansHint}
                                            highlightNumbers={highlightNumbers}
                                        />
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </article>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-slate-700 dark:bg-dark-card/95">
                <div className="mx-auto flex max-w-md gap-2">
                    <button
                        type="button"
                        onClick={() => void copyText(inviteCode, 'inviteCodeCopied')}
                        disabled={!inviteCode}
                        className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-ghana-green/30 bg-ghana-green/5 text-sm font-bold text-ghana-green disabled:opacity-45 active:scale-[0.98] dark:bg-ghana-green/10"
                    >
                        <span className="material-symbols-outlined text-[18px]">tag</span>
                        {t('inviteCopyCode')}
                    </button>
                    <button
                        type="button"
                        onClick={() => void copyText(shareLinkCopyText, 'inviteLinkCopied')}
                        disabled={!shareLinkCopyText}
                        className="flex h-12 flex-[1.2] items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-black text-ghana-green shadow-md shadow-primary/25 disabled:opacity-45 active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined text-[18px] filled">link</span>
                        {t('inviteCopyLink')}
                    </button>
                </div>
            </footer>

            {rulesOpen ? (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="invite-rules-title"
                    onClick={() => setRulesOpen(false)}
                >
                    <div
                        className="max-h-[min(28rem,80vh)] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-dark-card"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                            <h3 id="invite-rules-title" className="text-lg font-black text-ghana-green">
                                {t('inviteRulesTitle')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setRulesOpen(false)}
                                className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
                                aria-label={t('commonClose')}
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                        <ol className="max-h-[min(22rem,65vh)] space-y-2.5 overflow-y-auto px-5 py-4">
                            {rules.map((rule, index) => (
                                <li
                                    key={rule}
                                    className="flex gap-2.5 text-sm leading-relaxed text-gray-600 dark:text-slate-400"
                                >
                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ghana-green/10 text-xs font-black text-ghana-green">
                                        {index + 1}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <InviteBeansRichText
                                            text={rule}
                                            hint={beansHint}
                                            highlightNumbers={highlightNumbers}
                                        />
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            ) : null}

            {myRewardsOpen ? (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="invite-my-rewards-title"
                    onClick={() => setMyRewardsOpen(false)}
                >
                    <div
                        className="max-h-[min(32rem,85vh)] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-dark-card"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                            <h3 id="invite-my-rewards-title" className="text-lg font-black text-ghana-green">
                                {t('inviteMyRewardsTitle')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setMyRewardsOpen(false)}
                                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
                                aria-label={t('commonClose')}
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                        <div className="max-h-[min(26rem,72vh)] overflow-y-auto px-5 py-4">
                            <InviteMyRewardsPanel
                                isLoggedIn={isLoggedIn}
                                loading={myRewardsLoading}
                                data={myRewards}
                                onRefresh={() => void loadMyRewards()}
                            />
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default InviteRewards;
