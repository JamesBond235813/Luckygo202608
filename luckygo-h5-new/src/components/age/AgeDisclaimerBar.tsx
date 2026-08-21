import { Link } from 'react-router-dom';
import { useAgeCompliance } from '../../context/AgeComplianceContext';
import { useI18n } from '../../lib/useI18n';

/** 页面底部一行合规提示，不占用大块区域 */
export function AgeDisclaimerBar({ className = '' }: { className?: string }) {
    const { t } = useI18n();
    const { config, isMinor } = useAgeCompliance();

    if (isMinor) return null;

    return (
        <p
            className={`text-center text-[10px] leading-relaxed text-gray-400 dark:text-slate-500 ${className}`}
        >
            {config.footerDisclaimer}{' '}
            <Link to="/responsible-gaming" className="font-bold text-ghana-green underline dark:text-primary">
                {t('ageResponsibleLink')}
            </Link>
        </p>
    );
}
