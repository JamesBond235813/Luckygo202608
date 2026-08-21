import type { LocalLanguageCode } from './localization';
import { DEFAULT_MIN_AGE } from './support-config';

export type ComplianceConfig = {
    policyVersion: string;
    minAge: number;
    gateTitle: string;
    gateBody: string;
    minorTitle: string;
    minorBody: string;
    spendConfirmText: string;
    footerDisclaimer: string;
    responsibleGamingBody: string;
};

export const DEFAULT_COMPLIANCE_CONFIG: ComplianceConfig = {
    policyVersion: '1',
    minAge: DEFAULT_MIN_AGE,
    gateTitle: '',
    gateBody: '',
    minorTitle: '',
    minorBody: '',
    spendConfirmText: '',
    footerDisclaimer: '',
    responsibleGamingBody: '',
};

/** 后台多为英文单语文案；中文界面始终走 i18n，避免切换语言后仍显示英文 */
export function replaceComplianceAgePlaceholder(text: string, minAge: number): string {
    return text.replace(/\{age\}/g, String(minAge));
}

export function resolveComplianceLocalizedText(
    apiText: string,
    language: LocalLanguageCode,
    t: (key: string) => string,
    i18nKey: string,
): string {
    if (language === 'zh') {
        return t(i18nKey);
    }
    return apiText.trim() || t(i18nKey);
}

export function mergeComplianceWithDefaults(
    config: ComplianceConfig,
    t: (key: string) => string,
    language: LocalLanguageCode,
): ComplianceConfig {
    const pick = (api: string, key: string) => resolveComplianceLocalizedText(api, language, t, key);
    const withAge = (text: string) => replaceComplianceAgePlaceholder(text, config.minAge);
    return {
        ...config,
        gateTitle: pick(config.gateTitle, 'ageGateTitle'),
        gateBody: withAge(pick(config.gateBody, 'ageGateBody')),
        minorTitle: pick(config.minorTitle, 'ageMinorTitle'),
        minorBody: withAge(pick(config.minorBody, 'ageMinorBody')),
        spendConfirmText: withAge(pick(config.spendConfirmText, 'ageSpendConfirm')),
        footerDisclaimer: withAge(pick(config.footerDisclaimer, 'ageFooterDisclaimer')),
        responsibleGamingBody: withAge(pick(config.responsibleGamingBody, 'ageResponsibleBody')),
    };
}
