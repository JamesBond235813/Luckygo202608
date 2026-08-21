import { Link, useNavigate } from 'react-router-dom';
import { AppPageNav } from '../components/AppPageNav';
import { ContentBulletList, ContentFaqList, ContentSection } from '../components/ContentSection';
import { SupportContactLinks } from '../components/SupportContactLinks';
import { useAgeCompliance } from '../context/AgeComplianceContext';
import { useSupportContact } from '../hooks/useSupportContact';
import { CURRENCY_CODE } from '../lib/localization';
import { useI18n } from '../lib/useI18n';

function fmt(text: string, vars: Record<string, string>) {
    return Object.entries(vars).reduce((acc, [key, value]) => acc.replaceAll(`{${key}}`, value), text);
}

const HelpCenter: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const { config } = useAgeCompliance();
    const { config: support, hasAny } = useSupportContact();
    const vars = {
        age: String(config.minAge),
        currency: CURRENCY_CODE,
        appName: t('appName'),
    };
    const f = (key: string) => fmt(t(key), vars);

    const loginItems = [f('helpLoginItem1'), f('helpLoginItem2'), f('helpLoginItem3'), f('helpLoginItem4')];
    const accountItems = [f('helpAccountItem1'), f('helpAccountItem2'), f('helpAccountItem3')];
    const faqItems = [
        { question: f('helpFaq1Q'), answer: f('helpFaq1A') },
        { question: f('helpFaq2Q'), answer: f('helpFaq2A') },
        { question: f('helpFaq3Q'), answer: f('helpFaq3A') },
        { question: f('helpFaq4Q'), answer: f('helpFaq4A') },
        { question: f('helpFaq5Q'), answer: f('helpFaq5A') },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-12 font-display text-gray-900 dark:bg-dark-surface dark:text-slate-100">
            <AppPageNav title={t('helpPageTitle')} onBack={() => navigate(-1)} />
            <main className="space-y-4 px-4 py-4">
                <ContentSection icon="support_agent" title={t('helpPageTitle')} intro={f('helpPageIntro')} tone="amber">
                    <ContentBulletList
                        items={[f('helpPageBullet1'), f('helpPageBullet2'), f('helpPageBullet3')]}
                        tone="amber"
                    />
                </ContentSection>

                <ContentSection icon="login" title={t('helpSectionLogin')} intro={f('helpSectionLoginIntro')}>
                    <ContentBulletList items={loginItems} />
                </ContentSection>

                <ContentSection icon="shield" title={t('helpSectionAccount')} intro={f('helpSectionAccountIntro')}>
                    <ContentBulletList items={accountItems} />
                </ContentSection>

                <ContentSection icon="quiz" title={t('helpSectionFaq')}>
                    <ContentFaqList items={faqItems} />
                </ContentSection>

                <ContentSection icon="policy" title={t('helpSectionRelated')}>
                    <div className="space-y-2 text-sm">
                        <Link
                            to="/responsible-gaming"
                            className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-3 font-semibold text-ghana-green dark:bg-slate-800/60 dark:text-primary"
                        >
                            {t('ageResponsibleLink')}
                            <span className="material-symbols-outlined text-base">chevron_right</span>
                        </Link>
                        <Link
                            to="/terms"
                            className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-3 font-semibold text-ghana-green dark:bg-slate-800/60 dark:text-primary"
                        >
                            {t('loginTermsPrivacy')}
                            <span className="material-symbols-outlined text-base">chevron_right</span>
                        </Link>
                    </div>
                </ContentSection>

                {hasAny ? (
                    <ContentSection icon="contact_phone" title={t('helpSectionContact')} intro={f('helpSectionContactIntro')}>
                        <SupportContactLinks config={support} />
                    </ContentSection>
                ) : null}
            </main>
        </div>
    );
};

export default HelpCenter;
