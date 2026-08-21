import { useCallback, useEffect, useState } from 'react';
import { getCurrentLanguage, t, type LocalLanguageCode } from './localization';

/** Re-render when `luckygo-language-change` fires (e.g. Me page language select). */
export function useI18n(): { t: (key: string) => string; language: LocalLanguageCode } {
    const [, setTick] = useState(0);
    useEffect(() => {
        const bump = () => setTick((n) => n + 1);
        window.addEventListener('luckygo-language-change', bump);
        return () => window.removeEventListener('luckygo-language-change', bump);
    }, []);
    const language = getCurrentLanguage();
    const tr = useCallback((key: string) => t(key, language), [language]);
    return { t: tr, language };
}
