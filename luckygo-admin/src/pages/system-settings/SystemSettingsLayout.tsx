import { useMemo } from 'react';
import { Card, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { CalendarOutlined, GiftOutlined, SettingOutlined } from '@ant-design/icons';
import { Outlet, useLocation } from 'react-router-dom';
import { useAdminShell } from '../../context/AdminShellContext';
import { useAdminI18n, type TranslationKey } from '../../lib/i18n';
import {
    SYSTEM_SETTINGS_SECTION_BASIC,
    SYSTEM_SETTINGS_SECTION_CHECKIN,
    SYSTEM_SETTINGS_SECTION_INVITE,
} from './constants';

type SectionDef = {
    id: string;
    path: string;
    labelKey: TranslationKey;
    icon: React.ReactNode;
};

const sections: SectionDef[] = [
    {
        id: SYSTEM_SETTINGS_SECTION_BASIC,
        path: 'basic',
        labelKey: 'systemConfigSectionBasic',
        icon: <SettingOutlined />,
    },
    {
        id: SYSTEM_SETTINGS_SECTION_INVITE,
        path: 'invite',
        labelKey: 'systemConfigSectionInvite',
        icon: <GiftOutlined />,
    },
    {
        id: SYSTEM_SETTINGS_SECTION_CHECKIN,
        path: 'checkin',
        labelKey: 'systemConfigSectionCheckin',
        icon: <CalendarOutlined />,
    },
];

const SystemSettingsLayout = () => {
    const { t } = useAdminI18n();
    const { openTab } = useAdminShell();
    const location = useLocation();

    const activeSection = useMemo(() => {
        const match = sections.find((s) => location.pathname.endsWith(`/settings/${s.path}`));
        return match?.id ?? SYSTEM_SETTINGS_SECTION_BASIC;
    }, [location.pathname]);

    const menuItems: MenuProps['items'] = sections.map((section) => ({
        key: section.id,
        icon: section.icon,
        label: t(section.labelKey),
    }));

    const onMenuClick: MenuProps['onClick'] = ({ key }) => {
        const section = sections.find((s) => s.id === key);
        if (section) openTab(`/settings/${section.path}`);
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <Card
                    size="small"
                    style={{ width: 220, flexShrink: 0 }}
                    styles={{ body: { padding: 8 } }}
                >
                    <Menu
                        mode="inline"
                        selectedKeys={[activeSection]}
                        items={menuItems}
                        onClick={onMenuClick}
                        style={{ border: 'none' }}
                    />
                </Card>

                <Card size="small" style={{ flex: 1, minWidth: 280 }}>
                    <Outlet />
                </Card>
            </div>
        </div>
    );
};

export default SystemSettingsLayout;
