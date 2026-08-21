import { useNavigate } from 'react-router-dom';
import { AppPageNav } from '../components/AppPageNav';
import { ContentBulletList, ContentSection } from '../components/ContentSection';
import { SupportContactLinks } from '../components/SupportContactLinks';
import { useAgeCompliance } from '../context/AgeComplianceContext';
import { useSupportContact } from '../hooks/useSupportContact';
import { MIN_PARTICIPATION_GHS } from '../constants';
import { CURRENCY_CODE, formatCurrencyPlain } from '../lib/localization';
import { useI18n } from '../lib/useI18n';

function fmt(text: string, vars: Record<string, string>) {
    return Object.entries(vars).reduce((acc, [key, value]) => acc.replaceAll(`{${key}}`, value), text);
}

const TermsPrivacy: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const { config } = useAgeCompliance();
    const { config: support, hasAny } = useSupportContact();
    const vars = {
        age: String(config.minAge),
        currency: CURRENCY_CODE,
        minAmount: formatCurrencyPlain(MIN_PARTICIPATION_GHS),
        appName: t('appName'),
    };
    const f = (key: string) => fmt(t(key), vars);

    return (
        <div className="min-h-screen bg-gray-50 pb-12 font-display text-gray-900 dark:bg-dark-surface dark:text-slate-100">
            <AppPageNav title={t('termsPageTitle')} onBack={() => navigate(-1)} />
            <main className="space-y-4 px-4 py-4">
                <ContentSection icon="gavel" title={t('termsSectionService')} intro={f('termsServiceIntro')}>
                    <ContentBulletList
                        items={[
                            f('termsServiceItem1'),
                            f('termsServiceItem2'),
                            f('termsServiceItem3'),
                            f('termsServiceItem4'),
                            f('termsServiceItem5'),
                        ]}
                    />
                </ContentSection>

                <ContentSection icon="casino" title={t('termsSectionGameplay')} intro={f('termsGameplayIntro')}>
                    <ContentBulletList
                        items={[
                            f('termsGameplayItem1'),
                            f('termsGameplayItem2'),
                            f('termsGameplayItem3'),
                            f('termsGameplayItem4'),
                        ]}
                    />
                </ContentSection>

                <ContentSection icon="account_balance_wallet" title={t('termsSectionPayments')} intro={f('termsPaymentsIntro')}>
                    <ContentBulletList
                        items={[f('termsPaymentsItem1'), f('termsPaymentsItem2'), f('termsPaymentsItem3')]}
                    />
                </ContentSection>

                <ContentSection icon="lock" title={t('termsSectionPrivacy')} intro={f('termsPrivacyIntro')}>
                    <ContentBulletList
                        items={[
                            f('termsPrivacyItem1'),
                            f('termsPrivacyItem2'),
                            f('termsPrivacyItem3'),
                            f('termsPrivacyItem4'),
                            f('termsPrivacyItem5'),
                        ]}
                    />
                </ContentSection>

                <ContentSection icon="cookie" title={t('termsSectionCookies')} intro={f('termsCookiesIntro')}>
                    <ContentBulletList items={[f('termsCookiesItem1'), f('termsCookiesItem2')]} />
                </ContentSection>

                <ContentSection icon="update" title={t('termsSectionUpdates')} intro={f('termsUpdatesIntro')} />

                {hasAny ? (
                    <ContentSection icon="mail" title={t('termsSectionContact')} intro={f('termsContactIntro')}>
                        <SupportContactLinks config={support} />
                    </ContentSection>
                ) : null}

                <p className="px-1 text-center text-[10px] leading-relaxed text-gray-400 dark:text-slate-500">
                    {f('termsFooterNote')}
                </p>
            </main>
        </div>
    );
};

export default TermsPrivacy;
