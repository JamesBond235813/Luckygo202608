import { createContext, useContext } from 'react';
import { en, type TranslationKey } from './en';
import { zh } from './zh';

export type { TranslationKey };
export type AdminLanguage = 'en' | 'zh' | 'tw' | 'gaa' | 'ee' | 'ha';

export const adminLanguages: Array<{ code: AdminLanguage; label: string; nativeName: string }> = [
    { code: 'en', label: 'English', nativeName: 'English' },
    { code: 'zh', label: 'Chinese', nativeName: '中文' },
    { code: 'tw', label: 'Twi', nativeName: 'Twi' },
    { code: 'gaa', label: 'Ga', nativeName: 'Ga' },
    { code: 'ee', label: 'Ewe', nativeName: 'Ewe' },
    { code: 'ha', label: 'Hausa', nativeName: 'Hausa' },
];

const dictionaries: Record<'en' | 'zh', Record<TranslationKey, string>> = { en, zh };

export const normalizeLanguage = (language: string | null): AdminLanguage => {
    if (language && adminLanguages.some((item) => item.code === language)) {
        return language as AdminLanguage;
    }
    return 'zh';
};

const resolveDictionary = (language: AdminLanguage): Record<TranslationKey, string> => {
    if (language === 'zh') return dictionaries.zh;
    return dictionaries.en;
};

export const translate = (language: AdminLanguage, key: TranslationKey): string => {
    const dict = resolveDictionary(language);
    return dict[key] ?? dictionaries.en[key] ?? key;
};

export const tf = (
    language: AdminLanguage,
    key: TranslationKey,
    vars: Record<string, string | number> = {},
): string => {
    let text = translate(language, key);
    for (const [k, v] of Object.entries(vars)) {
        text = text.split(`{${k}}`).join(String(v));
    }
    return text;
};

/** 商品/订单状态 */
export const productStatusLabel = (language: AdminLanguage, status: string): string => {
    const campaignKeys: Record<string, TranslationKey> = {
        draft: 'campaignStatusDraft',
        selling: 'campaignStatusSelling',
        sold_out: 'campaignStatusSoldOut',
        drawing: 'campaignStatusDrawing',
        ended: 'campaignStatusEnded',
        cancelled: 'campaignStatusCancelled',
        active: 'active',
    };
    const key = campaignKeys[status];
    if (key) return translate(language, key);
    return status;
};

/** 中奖履约状态 */
export const winningStatusLabel = (language: AdminLanguage, status: string): string => {
    if (status === 'Received') return translate(language, 'statusReceived');
    if (status === 'Processing' || status === 'Shipped') return translate(language, 'statusProcessing');
    return status;
};

export interface AdminI18nContextValue {
    language: AdminLanguage;
    setLanguage: (language: AdminLanguage) => void;
    t: (key: TranslationKey) => string;
    tf: (key: TranslationKey, vars?: Record<string, string | number>) => string;
    productStatusLabel: (status: string) => string;
    winningStatusLabel: (status: string) => string;
}

export const AdminI18nContext = createContext<AdminI18nContextValue | null>(null);

export const useAdminI18n = () => {
    const context = useContext(AdminI18nContext);
    if (!context) {
        throw new Error('useAdminI18n must be used inside AdminI18nProvider');
    }
    return context;
};
