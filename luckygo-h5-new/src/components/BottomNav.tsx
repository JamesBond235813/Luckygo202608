import { useNavigate, useLocation } from 'react-router-dom';
import { Home, User, History, LayoutGrid } from 'lucide-react';
import { cn } from '../lib/utils';
import { useI18n } from '../lib/useI18n';

export const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useI18n();

    const tabs = [
        { icon: Home, label: t('home'), path: '/' },
        { icon: LayoutGrid, label: t('categories'), path: '/categories' },
        { icon: History, label: t('history'), path: '/history' },
        { icon: User, label: t('me'), path: '/me' },
    ];

    return (
        <nav aria-label="Primary navigation" className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#e5ebe7]/90 bg-white/95 pb-safe shadow-[0_-8px_24px_rgba(11,50,32,0.06)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
            <div className="mx-auto flex h-[4.35rem] max-w-xl items-center justify-around px-2">
                {tabs.map((tab) => {
                    const isActive =
                        tab.path === '/'
                            ? location.pathname === '/'
                            : location.pathname === tab.path ||
                              location.pathname.startsWith(`${tab.path}/`);
                    return (
                        <button
                            key={tab.path}
                            onClick={() => navigate(tab.path)}
                            className={cn(
                                'flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-colors',
                                isActive ? 'font-bold text-ghana-green' : 'text-gray-400 dark:text-slate-500',
                            )}
                        >
                            <tab.icon
                                size={24}
                                strokeWidth={isActive ? 2.5 : 2}
                                fill={isActive ? 'currentColor' : 'none'}
                                className={isActive ? 'rounded-xl bg-emerald-50 p-1 dark:bg-emerald-950/60' : ''}
                            />
                            <span className="text-[10px] font-semibold leading-none">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
