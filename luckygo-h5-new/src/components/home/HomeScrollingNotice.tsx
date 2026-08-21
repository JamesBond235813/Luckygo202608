import { useMemo } from 'react';
import { useI18n } from '../../lib/useI18n';

type HomeScrollingNoticeProps = {
    /** 后台配置的公告条目；留空则不展示 */
    messages: string[];
};

export function HomeScrollingNotice({ messages }: HomeScrollingNoticeProps) {
    const { t } = useI18n();

    const line = useMemo(() => {
        const parts = messages.filter((item) => item.trim().length > 0);
        return parts.join(' · ');
    }, [messages]);

    if (!line) return null;

    return (
        <div
            className="mx-2 flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-2 ring-1 ring-primary/15 dark:bg-primary/5 dark:ring-primary/10"
            role="region"
            aria-label={t('homeNoticeAria')}
        >
            <span
                className="material-symbols-outlined shrink-0 text-[18px] leading-none text-ghana-green dark:text-primary"
                aria-hidden
            >
                campaign
            </span>
            <div className="min-w-0 flex-1 overflow-hidden">
                <div className="group flex w-max animate-home-notice-marquee motion-reduce:animate-none hover:[animation-play-state:paused]">
                    <p className="shrink-0 whitespace-nowrap px-6 text-xs font-semibold text-gray-700 dark:text-slate-300">
                        {line}
                    </p>
                    <p className="shrink-0 whitespace-nowrap px-6 text-xs font-semibold text-gray-700 dark:text-slate-300" aria-hidden>
                        {line}
                    </p>
                </div>
            </div>
        </div>
    );
}
