import { useNavigate } from 'react-router-dom';
import { AppPageNav } from '../components/AppPageNav';
import { SupportContactLinks } from '../components/SupportContactLinks';
import { useAgeCompliance } from '../context/AgeComplianceContext';
import { useSupportContact } from '../hooks/useSupportContact';
import { MIN_PARTICIPATION_GHS } from '../constants';
import { CURRENCY_CODE, formatCurrencyPlain } from '../lib/localization';
import { useI18n } from '../lib/useI18n';

function replacePlaceholders(text: string, age: number, currency: string, minAmount: string) {
    return text
        .replace(/\{age\}/g, String(age))
        .replace(/\{currency\}/g, currency)
        .replace(/\{minAmount\}/g, minAmount);
}

type SectionProps = {
    icon: string;
    title: string;
    intro?: string;
    items: string[];
    tone?: 'amber' | 'default';
};

function ResponsibleSection({ icon, title, intro, items, tone = 'default' }: SectionProps) {
    const isAmber = tone === 'amber';
    return (
        <section
            className={
                isAmber
                    ? 'rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30'
                    : 'rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-dark-card'
            }
        >
            <div
                className={`mb-2 flex items-center gap-2 ${isAmber ? 'text-amber-700 dark:text-amber-400' : 'text-gray-800 dark:text-slate-200'}`}
            >
                <span className="material-symbols-outlined">{icon}</span>
                <h2 className="text-sm font-black">{title}</h2>
            </div>
            {intro ? (
                <p
                    className={`mb-3 text-sm leading-relaxed ${isAmber ? 'text-amber-900/90 dark:text-amber-100/90' : 'text-gray-600 dark:text-slate-400'}`}
                >
                    {intro}
                </p>
            ) : null}
            <ul className={`space-y-2 text-sm ${isAmber ? 'text-amber-900/90 dark:text-amber-100/90' : 'text-gray-700 dark:text-slate-300'}`}>
                {items.map((item) => (
                    <li key={item} className="flex gap-2">
                        <span
                            className={`material-symbols-outlined shrink-0 text-base ${isAmber ? 'text-amber-600 dark:text-amber-400' : 'text-ghana-green'}`}
                        >
                            {isAmber ? 'info' : 'check_circle'}
                        </span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}

const ResponsibleGaming: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const { config } = useAgeCompliance();
    const { config: support, hasAny } = useSupportContact();
    const age = config.minAge;
    const currency = CURRENCY_CODE;
    const minAmount = formatCurrencyPlain(MIN_PARTICIPATION_GHS);
    const fmt = (key: string) => replacePlaceholders(t(key), age, currency, minAmount);

    const bodyText = replacePlaceholders(config.responsibleGamingBody, age, currency, minAmount);
    const keyPoints = [fmt('ageResponsibleBullet1'), fmt('ageResponsibleBullet2'), fmt('ageResponsibleBullet3')];
    const gameItems = [
        fmt('ageResponsibleGamesItem1'),
        fmt('ageResponsibleGamesItem2'),
        fmt('ageResponsibleGamesItem3'),
        fmt('ageResponsibleGamesItem4'),
    ];
    const walletItems = [
        fmt('ageResponsibleWalletItem1'),
        fmt('ageResponsibleWalletItem2'),
        fmt('ageResponsibleWalletItem3'),
        fmt('ageResponsibleWalletItem4'),
    ];
    const riskItems = [
        fmt('ageResponsibleRiskItem1'),
        fmt('ageResponsibleRiskItem2'),
        fmt('ageResponsibleRiskItem3'),
        fmt('ageResponsibleRiskItem4'),
    ];
    const tipItems = [
        fmt('ageResponsibleTipsItem1'),
        fmt('ageResponsibleTipsItem2'),
        fmt('ageResponsibleTipsItem3'),
        fmt('ageResponsibleTipsItem4'),
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-12 font-display text-gray-900 dark:bg-dark-surface dark:text-slate-100">
            <AppPageNav title={t('ageResponsiblePageTitle')} onBack={() => navigate(-1)} />
            <main className="space-y-4 px-4 py-4">
                <ResponsibleSection
                    icon="policy"
                    title={t('ageResponsiblePageHeading')}
                    intro={bodyText}
                    items={keyPoints}
                    tone="amber"
                />

                <ResponsibleSection
                    icon="casino"
                    title={t('ageResponsibleSectionGames')}
                    intro={fmt('ageResponsibleGamesIntro')}
                    items={gameItems}
                />

                <ResponsibleSection
                    icon="account_balance_wallet"
                    title={t('ageResponsibleSectionWallet')}
                    intro={fmt('ageResponsibleWalletIntro')}
                    items={walletItems}
                />

                <ResponsibleSection
                    icon="warning"
                    title={t('ageResponsibleSectionRisk')}
                    intro={fmt('ageResponsibleRiskIntro')}
                    items={riskItems}
                />

                <ResponsibleSection
                    icon="self_improvement"
                    title={t('ageResponsibleSectionTips')}
                    items={tipItems}
                />

                {hasAny ? (
                    <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-dark-card">
                        <div className="mb-2 flex items-center gap-2 text-gray-800 dark:text-slate-200">
                            <span className="material-symbols-outlined">support_agent</span>
                            <h2 className="text-sm font-black">{t('ageResponsibleSectionHelp')}</h2>
                        </div>
                        <p className="mb-3 text-sm leading-relaxed text-gray-600 dark:text-slate-400">
                            {fmt('ageResponsibleHelpIntro')}
                        </p>
                        <SupportContactLinks config={support} />
                    </section>
                ) : null}
            </main>
        </div>
    );
};

export default ResponsibleGaming;
