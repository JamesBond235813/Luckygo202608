import { ConfigProvider, theme } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import type { ReactNode } from 'react';
import { useAdminI18n } from './i18n';

/** 与后台 i18n 同步的 Ant Design 主题与语言 */
export const AdminAntdProvider = ({ children }: { children: ReactNode }) => {
    const { language } = useAdminI18n();

    return (
        <ConfigProvider
            locale={language === 'zh' ? zhCN : enUS}
            theme={{
                algorithm: theme.defaultAlgorithm,
                token: {
                    colorPrimary: '#059669',
                    borderRadius: 8,
                    controlOutlineWidth: 0,
                    fontFamily:
                        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                },
                components: {
                    Button: {
                        // Ant Design 6 默认带底部描边阴影，关闭后与文档示例一致
                        defaultShadow: 'none',
                        primaryShadow: 'none',
                        dangerShadow: 'none',
                    },
                    Input: {
                        activeShadow: 'none',
                        errorActiveShadow: 'none',
                        warningActiveShadow: 'none',
                    },
                    Layout: {
                        siderBg: '#111827',
                        triggerBg: '#1f2937',
                    },
                    Menu: {
                        darkItemBg: 'transparent',
                        darkSubMenuItemBg: 'transparent',
                    },
                },
            }}
        >
            {children}
        </ConfigProvider>
    );
};
