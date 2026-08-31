import { useEffect, useMemo, useState } from 'react';
import { Layout as AntLayout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
    AccountBookOutlined,
    AppstoreOutlined,
    SettingOutlined,
    TeamOutlined,
    DashboardOutlined,
    TrophyOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminShellProvider, useAdminShell } from '../context/AdminShellContext';
import { isMenuParentKey, normalizeTabPath } from '../lib/admin-routes';
import { useAdminI18n } from '../lib/i18n';
import { AdminTopBar } from './admin-shell/AdminTopBar';
import { AdminTabBar } from './admin-shell/AdminTabBar';
import './admin-shell/admin-shell.css';

const { Sider, Content } = AntLayout;

const SIDER_WIDTH = 240;
const SIDER_COLLAPSED_WIDTH = 72;

const FINANCE_PATHS = ['/finance/payments', '/finance/transactions', '/finance/withdrawals'] as const;
const LOTTERY_PATHS = ['/campaigns', '/promo-records', '/winnings'] as const;
const PRODUCT_PATHS = ['/products', '/product-categories'] as const;
const SYSTEM_PATHS = ['/system/sms'] as const;
const isSystemSettingsPath = (path: string) => path === '/settings' || path.startsWith('/settings/');

interface LayoutProps {
    onLogout: () => void;
}

function AdminLayoutInner({ onLogout }: LayoutProps) {
    const { t } = useAdminI18n();
    const location = useLocation();
    const { collapsed, openTab, outletRevision } = useAdminShell();

    const menuItems: MenuProps['items'] = useMemo(
        () => [
            { key: '/', icon: <DashboardOutlined />, label: t('dashboard') },
            {
                key: 'products',
                icon: <AppstoreOutlined />,
                label: t('productCenter'),
                children: [
                    { key: '/products', label: t('productList') },
                    { key: '/product-categories', label: t('productCategories') },
                ],
            },
            {
                key: 'promo',
                icon: <TrophyOutlined />,
                label: t('lotteryCenter'),
                children: [
                    { key: '/campaigns', label: t('campaigns') },
                    { key: '/promo-records', label: t('orders') },
                    { key: '/winnings', label: t('winnings') },
                ],
            },
            { key: '/users', icon: <TeamOutlined />, label: t('users') },
            {
                key: 'finance',
                icon: <AccountBookOutlined />,
                label: t('financeCenter'),
                children: [
                    { key: '/finance/payments', label: t('paymentRecords') },
                    { key: '/finance/transactions', label: t('transactionRecords') },
                    { key: '/finance/withdrawals', label: t('withdrawalRecords') },
                ],
            },
            {
                key: 'system',
                icon: <SettingOutlined />,
                label: t('systemCenter'),
                children: [
                    { key: '/settings', label: t('systemConfig') },
                    { key: '/system/sms', label: t('smsSendLogs') },
                ],
            },
        ],
        [t],
    );

    const selectedKey = useMemo(() => {
        const path = normalizeTabPath(location.pathname);
        if ((FINANCE_PATHS as readonly string[]).includes(path)) return path;
        if ((LOTTERY_PATHS as readonly string[]).includes(path)) return path;
        if ((PRODUCT_PATHS as readonly string[]).includes(path)) return path;
        if (isSystemSettingsPath(path)) return '/settings';
        if ((SYSTEM_PATHS as readonly string[]).includes(path)) return path;
        return path;
    }, [location.pathname]);

    const parentOpenKey = useMemo(() => {
        const path = selectedKey;
        if (path.startsWith('/finance')) return 'finance';
        if ((LOTTERY_PATHS as readonly string[]).includes(path) || path.startsWith('/orders')) return 'promo';
        if ((PRODUCT_PATHS as readonly string[]).includes(path)) return 'products';
        if (isSystemSettingsPath(path) || (SYSTEM_PATHS as readonly string[]).includes(path)) return 'system';
        return null;
    }, [selectedKey]);

    const [openKeys, setOpenKeys] = useState<string[]>(() => (parentOpenKey ? [parentOpenKey] : []));

    useEffect(() => {
        if (parentOpenKey) {
            // The menu must follow the active route after navigation.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setOpenKeys((prev) => (prev.includes(parentOpenKey) ? prev : [parentOpenKey]));
        }
    }, [parentOpenKey]);

    const siderWidth = collapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH;

    return (
        <AntLayout style={{ minHeight: '100vh' }}>
            <Sider
                width={SIDER_WIDTH}
                collapsedWidth={SIDER_COLLAPSED_WIDTH}
                collapsed={collapsed}
                trigger={null}
                theme="dark"
                style={{
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 30,
                    overflow: 'auto',
                }}
            >
                <div className="admin-sider-logo">
                    <span className="admin-sider-logo-mark">E</span>
                    {!collapsed ? <span className="admin-sider-logo-text">{t('brandName')}</span> : null}
                </div>
                <Menu
                    className="admin-sider-menu"
                    theme="dark"
                    mode="inline"
                    inlineCollapsed={collapsed}
                    selectedKeys={[selectedKey === '/settings' ? '/settings' : selectedKey]}
                    openKeys={collapsed ? [] : openKeys}
                    onOpenChange={(keys) => setOpenKeys(keys)}
                    items={menuItems}
                    onClick={({ key }) => {
                        if (isMenuParentKey(key)) return;
                        const path = key === '/settings' ? '/settings/basic' : key;
                        openTab(path);
                    }}
                    style={{ borderInlineEnd: 0, padding: '8px 10px 24px' }}
                />
            </Sider>

            <AntLayout
                style={{
                    marginLeft: siderWidth,
                    transition: 'margin-left 0.2s ease',
                    minHeight: '100vh',
                    background: '#f1f5f9',
                }}
            >
                <div className="admin-shell-header">
                    <AdminTopBar onLogout={onLogout} />
                    <AdminTabBar />
                </div>
                <Content className="admin-shell-content">
                    <Outlet key={`${selectedKey}-${outletRevision}`} />
                </Content>
            </AntLayout>
        </AntLayout>
    );
}

export const Layout = (props: LayoutProps) => (
    <AdminShellProvider>
        <AdminLayoutInner {...props} />
    </AdminShellProvider>
);
