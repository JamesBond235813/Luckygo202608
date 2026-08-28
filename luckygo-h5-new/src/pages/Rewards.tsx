import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppPageNav } from '../components/AppPageNav';
import { AuthEmptyState } from '../components/AuthEmptyState';
import { isH5Authenticated } from '../lib/auth';
import { getApiErrorMessage, ApiService } from '../services/api';
import { showSimpleToast } from '../lib/simpleToast';
import { useI18n } from '../lib/useI18n';
import { useAgeCompliance } from '../context/AgeComplianceContext';
import type { RewardsSummary } from '../types';

const Rewards: React.FC = () => {
    const navigate = useNavigate();
    const { t, language } = useI18n();
    const { runAdultAction } = useAgeCompliance();
    const loggedIn = isH5Authenticated();
    const [summary, setSummary] = useState<RewardsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');

    const load = useCallback(async () => {
        if (!loggedIn) return;
        setLoading(true);
        try {
            setSummary(await ApiService.getRewardsSummary());
        } catch (error) {
            showSimpleToast(getApiErrorMessage(error, t('rewardsLoadFailed')));
        } finally {
            setLoading(false);
        }
    }, [loggedIn, t]);

    useEffect(() => { void load(); }, [load]);

    const doCheckin = () => {
        runAdultAction(() => {
            setBusy('checkin');
            return ApiService.checkinRewards()
                .then((result) => {
                    showSimpleToast(t('rewardsCheckinSuccess').replace('{beans}', String(result.beans)));
                    return load();
                })
                .catch((error) => showSimpleToast(getApiErrorMessage(error, t('rewardsCheckinFailed'))))
                .finally(() => setBusy(''));
        });
    };

    const claimTask = (code: string) => {
        runAdultAction(() => {
            setBusy(code);
            return ApiService.claimRewardTask(code)
                .then((result) => {
                    showSimpleToast(t('rewardsTaskClaimed').replace('{beans}', String(result.beans)));
                    return load();
                })
                .catch((error) => showSimpleToast(getApiErrorMessage(error, t('rewardsTaskClaimFailed'))))
                .finally(() => setBusy(''));
        });
    };

    if (!loggedIn) {
        return <div className="min-h-screen bg-gray-50 dark:bg-dark-surface"><AppPageNav title={t('rewardsTitle')} onBack={() => navigate('/me')} /><AuthEmptyState from="/rewards" /></div>;
    }

    const locale = language === 'zh' ? 'zh' : 'en';
    return (
        <div className="min-h-screen bg-gray-50 pb-10 dark:bg-dark-surface">
            <AppPageNav title={t('rewardsTitle')} onBack={() => navigate('/me')} />
            <main className="space-y-4 p-4">
                {loading && !summary ? <p className="py-12 text-center text-sm text-gray-500">{t('commonLoading')}</p> : null}
                {summary ? (
                    <>
                        <section className="rounded-2xl bg-ghana-green p-5 text-white shadow-lg">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-white/75">{t('rewardsBeansBalance')}</p>
                                    <p className="mt-2 text-4xl font-black tabular-nums text-primary">{summary.beans.toLocaleString()}</p>
                                </div>
                                <span className="material-symbols-outlined filled text-4xl text-primary">stars</span>
                            </div>
                            <p className="mt-3 text-xs leading-relaxed text-white/80">{t('rewardsExchangeHint')}</p>
                        </section>

                        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-dark-card">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="font-black text-gray-900 dark:text-slate-100">{t('rewardsCheckinTitle')}</h2>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                        {t('rewardsStreak').replace('{days}', String(summary.checkin.streakDays))}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    disabled={summary.checkin.checkedInToday || busy === 'checkin'}
                                    onClick={doCheckin}
                                    className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-ghana-green disabled:opacity-50"
                                >
                                    {summary.checkin.checkedInToday ? t('rewardsCheckedIn') : t('rewardsCheckinCta')}
                                </button>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-black text-gray-900 dark:text-slate-100">{t('rewardsTasksTitle')}</h2>
                                <button type="button" onClick={() => navigate('/invite')} className="text-xs font-bold text-ghana-green">{t('rewardsInviteLink')}</button>
                            </div>
                            {summary.tasks.map((task) => {
                                const title = locale === 'zh' ? task.titleZh : task.titleEn;
                                const description = locale === 'zh' ? task.descriptionZh : task.descriptionEn;
                                const completed = task.progress >= task.targetValue;
                                return (
                                    <article key={task.code} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-dark-card">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-gray-900 dark:text-slate-100">{title}</h3>
                                                <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-slate-400">{description}</p>
                                            </div>
                                            <span className="shrink-0 rounded-full bg-primary/20 px-2 py-1 text-xs font-black text-ghana-green">+{task.rewardBeans}</span>
                                        </div>
                                        <div className="mt-3 flex items-center gap-3">
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800"><div className="h-full rounded-full bg-ghana-green" style={{ width: `${Math.min(100, (task.progress / Math.max(task.targetValue, 1)) * 100)}%` }} /></div>
                                            {task.claimed ? <span className="text-xs font-bold text-emerald-600">{t('rewardsClaimed')}</span> : <button type="button" disabled={!completed || busy === task.code} onClick={() => claimTask(task.code)} className="rounded-lg bg-ghana-green px-3 py-2 text-xs font-bold text-white disabled:opacity-40">{t('rewardsClaim')}</button>}
                                        </div>
                                    </article>
                                );
                            })}
                        </section>
                    </>
                ) : null}
            </main>
        </div>
    );
};

export default Rewards;
