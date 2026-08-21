import { Badge, Breadcrumb, Button, Dropdown, Space, Tooltip, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
    BellOutlined,
    CloudDownloadOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    SettingOutlined,
    TranslationOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { useAdminShell } from '../../context/AdminShellContext';
import { normalizeTabPath, resolveAdminRouteMeta } from '../../lib/admin-routes';
import { useAdminI18n } from '../../lib/i18n';
import { adminLanguages, type AdminLanguage } from '../../lib/i18n';

type AdminTopBarProps = {
    onLogout: () => void;
};

export function AdminTopBar({ onLogout }: AdminTopBarProps) {
    const { t, setLanguage, language } = useAdminI18n();
    const { collapsed, toggleCollapsed, activeTabKey, openTab } = useAdminShell();

    const meta = resolveAdminRouteMeta(normalizeTabPath(activeTabKey));
    const breadcrumbItems = [
        ...(meta.parentKey
            ? [{ title: <span className="admin-breadcrumb-muted">{t(meta.parentKey)}</span> }]
            : []),
        { title: <span className="admin-breadcrumb-current">{t(meta.titleKey)}</span> },
    ];

    const accountMenu: MenuProps['items'] = [
        {
            key: 'logout',
            label: t('logout'),
            danger: true,
            onClick: onLogout,
        },
    ];

    const languageMenu: MenuProps['items'] = adminLanguages.map((item) => ({
        key: item.code,
        label: item.nativeName,
    }));

    return (
        <div className="admin-topbar">
            <div className="admin-topbar-left">
                <Tooltip title={collapsed ? t('shellExpandMenu') : t('shellCollapseMenu')}>
                    <Button
                        type="text"
                        className="admin-topbar-icon-btn"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={toggleCollapsed}
                    />
                </Tooltip>
                <Breadcrumb items={breadcrumbItems} className="admin-breadcrumb" />
            </div>

            <Space size={4} className="admin-topbar-right">
                <Dropdown
                    menu={{
                        items: languageMenu,
                        selectable: true,
                        selectedKeys: [language],
                        onClick: ({ key }) => setLanguage(key as AdminLanguage),
                    }}
                    placement="bottomRight"
                    trigger={['click']}
                >
                    <Tooltip title={t('adminLanguage')}>
                        <Button
                            type="text"
                            className="admin-topbar-icon-btn"
                            icon={<TranslationOutlined />}
                        />
                    </Tooltip>
                </Dropdown>
                <Tooltip title={t('navNotifications')}>
                    <Button
                        type="text"
                        className="admin-topbar-icon-btn"
                        icon={
                            <Badge dot color="#10b981">
                                <BellOutlined />
                            </Badge>
                        }
                        onClick={() => {
                            /* 预留：通知中心 */
                        }}
                    />
                </Tooltip>
                <Tooltip title={t('navDownloads')}>
                    <Button
                        type="text"
                        className="admin-topbar-icon-btn"
                        icon={<CloudDownloadOutlined />}
                        onClick={() => {
                            /* 预留：下载中心 */
                        }}
                    />
                </Tooltip>
                <Tooltip title={t('navSettings')}>
                    <Button
                        type="text"
                        className="admin-topbar-icon-btn"
                        icon={<SettingOutlined />}
                        onClick={() => openTab('/settings/basic')}
                    />
                </Tooltip>
                <Dropdown menu={{ items: accountMenu }} placement="bottomRight" trigger={['click']}>
                    <button type="button" className="admin-account-chip">
                        <span className="admin-account-avatar">
                            <UserOutlined />
                        </span>
                        <Typography.Text className="admin-account-label">{t('navAccount')}</Typography.Text>
                    </button>
                </Dropdown>
            </Space>
        </div>
    );
}
