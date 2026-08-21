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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 dark:bg-slate-900 dark:border-slate-800 pb-safe z-50">
            <div className="flex justify-around items-center h-16">
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
                                'flex flex-col items-center justify-center w-full h-full transition-colors',
                                isActive ? 'text-ghana-green' : 'text-gray-400',
                            )}
                        >
                            <tab.icon
                                size={24}
                                strokeWidth={isActive ? 2.5 : 2}
                                fill={isActive ? 'currentColor' : 'none'}
                                className={isActive ? 'fill-current/20' : ''}
                            />
                            <span className="text-[10px] font-medium mt-1">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
