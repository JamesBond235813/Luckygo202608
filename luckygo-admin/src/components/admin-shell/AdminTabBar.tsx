import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
    CloseOutlined,
    ColumnWidthOutlined,
    DownOutlined,
    ReloadOutlined,
    VerticalLeftOutlined,
    VerticalRightOutlined,
} from '@ant-design/icons';
import { useAdminShell } from '../../context/AdminShellContext';
import { useAdminI18n } from '../../lib/i18n';

export function AdminTabBar() {
    const { t } = useAdminI18n();
    const {
        tabs,
        activeTabKey,
        switchTab,
        closeTab,
        closeOtherTabs,
        closeLeftTabs,
        closeRightTabs,
        closeAllTabs,
        refreshCurrentTab,
    } = useAdminShell();

    const active = tabs.find((tab) => tab.key === activeTabKey);
    const activeIndex = tabs.findIndex((tab) => tab.key === activeTabKey);

    const actionItems: MenuProps['items'] = [
        {
            key: 'refresh',
            icon: <ReloadOutlined />,
            label: t('tabRefresh'),
            onClick: refreshCurrentTab,
        },
        { type: 'divider' },
        {
            key: 'close',
            icon: <CloseOutlined />,
            label: t('tabClose'),
            disabled: !active || active.affix,
            onClick: () => active && closeTab(active.key),
        },
        {
            key: 'closeOthers',
            icon: <ColumnWidthOutlined />,
            label: t('tabCloseOthers'),
            disabled: tabs.length <= 1,
            onClick: () => active && closeOtherTabs(active.key),
        },
        {
            key: 'closeLeft',
            icon: <VerticalRightOutlined />,
            label: t('tabCloseLeft'),
            disabled: activeIndex <= 0,
            onClick: () => active && closeLeftTabs(active.key),
        },
        {
            key: 'closeRight',
            icon: <VerticalLeftOutlined />,
            label: t('tabCloseRight'),
            disabled: activeIndex < 0 || activeIndex >= tabs.length - 1,
            onClick: () => active && closeRightTabs(active.key),
        },
        { type: 'divider' },
        {
            key: 'closeAll',
            icon: <CloseOutlined />,
            label: t('tabCloseAll'),
            onClick: closeAllTabs,
        },
    ];

    return (
        <div className="admin-tabbar">
            <div className="admin-tabbar-scroll" role="tablist">
                {tabs.map((tab) => {
                    const isActive = tab.key === activeTabKey;
                    return (
                        <div
                            key={tab.key}
                            role="tab"
                            aria-selected={isActive}
                            className={`admin-tab-item${isActive ? ' admin-tab-item-active' : ''}`}
                            onClick={() => switchTab(tab.key)}
                            onAuxClick={(event) => {
                                if (event.button === 1 && !tab.affix) {
                                    event.preventDefault();
                                    closeTab(tab.key);
                                }
                            }}
                        >
                            <span className="admin-tab-title">{t(tab.titleKey)}</span>
                            {!tab.affix ? (
                                <button
                                    type="button"
                                    className="admin-tab-close"
                                    aria-label={t('tabClose')}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        closeTab(tab.key);
                                    }}
                                >
                                    <CloseOutlined />
                                </button>
                            ) : null}
                        </div>
                    );
                })}
            </div>
            <div className="admin-tabbar-actions">
                <Dropdown menu={{ items: actionItems }} placement="bottomRight" trigger={['click']}>
                    <button type="button" className="admin-tabbar-menu-btn">
                        <span>{t('tabActions')}</span>
                        <DownOutlined className="admin-tabbar-menu-chevron" aria-hidden />
                    </button>
                </Dropdown>
            </div>
        </div>
    );
}
