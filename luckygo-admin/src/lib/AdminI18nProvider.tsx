import { useMemo, useState, type ReactNode } from 'react';
import {
    AdminI18nContext,
    normalizeLanguage,
    tf as tfCore,
    translate,
    productStatusLabel as productStatusLabelCore,
    winningStatusLabel as winningStatusLabelCore,
    type AdminI18nContextValue,
    type AdminLanguage,
    type TranslationKey,
} from './i18n';

const STORAGE_KEY = 'luckygo_admin_language';

export const AdminI18nProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<AdminLanguage>(() =>
        normalizeLanguage(localStorage.getItem(STORAGE_KEY)),
    );

    const setLanguage = (nextLanguage: AdminLanguage) => {
        setLanguageState(nextLanguage);
        localStorage.setItem(STORAGE_KEY, nextLanguage);
    };

    const value = useMemo<AdminI18nContextValue>(
        () => ({
            language,
            setLanguage,
            t: (key: TranslationKey) => translate(language, key),
            tf: (key: TranslationKey, vars?: Record<string, string | number>) => tfCore(language, key, vars),
            productStatusLabel: (status: string) => productStatusLabelCore(language, status),
            winningStatusLabel: (status: string) => winningStatusLabelCore(language, status),
        }),
        [language],
    );

    return <AdminI18nContext.Provider value={value}>{children}</AdminI18nContext.Provider>;
};
