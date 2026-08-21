import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ConfigProvider } from 'antd-mobile';
import enUS from 'antd-mobile/es/locales/en-US';
import zhCN from 'antd-mobile/es/locales/zh-CN';
import { getCurrentLanguage, type LocalLanguageCode } from '../lib/localization';

const localeForApp = (code: LocalLanguageCode) => (code === 'zh' ? zhCN : enUS);

/** 与 EBA Promo 语言选择同步，供 antd-mobile 内置文案（日期、对话框等）使用 */
export function AntdMobileProvider({ children }: { children: ReactNode }) {
    const [code, setCode] = useState<LocalLanguageCode>(() => getCurrentLanguage());

    useEffect(() => {
        const bump = () => setCode(getCurrentLanguage());
        window.addEventListener('luckygo-language-change', bump);
        return () => window.removeEventListener('luckygo-language-change', bump);
    }, []);

    const locale = useMemo(() => localeForApp(code), [code]);

    return <ConfigProvider locale={locale}>{children}</ConfigProvider>;
}
