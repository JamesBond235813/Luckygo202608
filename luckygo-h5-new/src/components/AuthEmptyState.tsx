import { useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/useI18n';
import { promptLogin } from '../lib/require-login';

interface AuthEmptyStateProps {
    /** 登录成功后回跳路径 */
    from?: string;
    className?: string;
}

/** 需登录才能查看的数据页空态 */
export const AuthEmptyState = ({ from = '/', className = '' }: AuthEmptyStateProps) => {
    const navigate = useNavigate();
    const { t } = useI18n();

    return (
        <div className={`flex flex-col items-center justify-center px-6 py-16 text-center ${className}`}>
            <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-[#f7eddb] dark:bg-slate-800">
                <span className="material-symbols-outlined text-3xl text-ghana-green">person</span>
            </div>
            <p className="mb-6 max-w-xs text-sm leading-6 text-gray-500 dark:text-slate-400">
                {t('authLoginRequiredDesc')}
            </p>
            <button
                type="button"
                onClick={() => { promptLogin(navigate, t('authLoginRequired'), from, 0); }}
                className="h-11 w-full max-w-xs rounded-lg bg-ghana-green text-sm font-black text-white"
            >
                {t('authGoLogin')}
            </button>
        </div>
    );
};
