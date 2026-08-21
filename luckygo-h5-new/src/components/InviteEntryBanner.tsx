import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInviteRewardsConfig } from '../hooks/useInviteRewardsConfig';
import { buildInviteRewardCopy } from '../lib/invite-rewards-copy';
import { promptLogin } from '../lib/require-login';
import { useI18n } from '../lib/useI18n';

/** 「我的」页邀请有礼入口；后台关闭活动时不展示 */
export const InviteEntryBanner: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const { config, loading } = useInviteRewardsConfig();
    const subtitle = useMemo(() => buildInviteRewardCopy(config, t).entrySubtitle, [config, t]);

    if (loading || !config.enabled) {
        return null;
    }

    return (
        <div className="pt-3">
        <button
            type="button"
            onClick={() => {
                if (!promptLogin(navigate, t('authLoginRequired'), '/invite')) return;
                navigate('/invite');
            }}
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-ghana-green via-[#00875a] to-[#006b3f] px-4 py-3 text-left shadow-md shadow-ghana-green/20 transition active:scale-[0.99]"
        >
            <div
                className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-primary/25 blur-2xl"
                aria-hidden
            />
            <div className="relative flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-sm backdrop-blur-sm">
                    <span className="material-symbols-outlined text-[26px] text-primary filled">redeem</span>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{t('inviteEntryTitle')}</span>
                        <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-primary">
                            {t('inviteEntryTag')}
                        </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-white/85">{subtitle}</p>
                </div>
                <span className="material-symbols-outlined shrink-0 text-[22px] text-primary transition group-hover:translate-x-0.5">
                    chevron_right
                </span>
            </div>
        </button>
        </div>
    );
};
