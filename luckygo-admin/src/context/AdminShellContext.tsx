import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { normalizeTabPath, resolveAdminRouteMeta } from '../lib/admin-routes';

import type { TranslationKey } from '../lib/i18n';

export type AdminTab = {
    key: string;
    path: string;
    titleKey: TranslationKey;
    affix?: boolean;
};

type AdminShellContextValue = {
    collapsed: boolean;
    setCollapsed: (value: boolean) => void;
    toggleCollapsed: () => void;
    tabs: AdminTab[];
    activeTabKey: string;
    openTab: (path: string) => void;
    switchTab: (key: string) => void;
    closeTab: (key: string) => void;
    closeOtherTabs: (key: string) => void;
    closeLeftTabs: (key: string) => void;
    closeRightTabs: (key: string) => void;
    closeAllTabs: () => void;
    refreshCurrentTab: () => void;
    outletRevision: number;
};

const STORAGE_TABS = 'admin_shell_tabs_v1';
const STORAGE_ACTIVE = 'admin_shell_active_v1';
const STORAGE_COLLAPSED = 'admin_shell_collapsed_v1';

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

function buildTab(path: string): AdminTab {
    const normalized = normalizeTabPath(path);
    const meta = resolveAdminRouteMeta(normalized);
    return {
        key: normalized,
        path: normalized,
        titleKey: meta.titleKey,
        affix: meta.affix,
    };
}

function loadStoredTabs(): AdminTab[] {
    try {
        const raw = sessionStorage.getItem(STORAGE_TABS);
        if (!raw) return [buildTab('/')];
        const parsed = JSON.parse(raw) as AdminTab[];
        if (!Array.isArray(parsed) || parsed.length === 0) return [buildTab('/')];
        const home = buildTab('/');
        const rest = parsed.filter((t) => t.key !== '/').map((t) => buildTab(t.path));
        return [home, ...rest];
    } catch {
        return [buildTab('/')];
    }
}

function loadStoredActive(tabs: AdminTab[]): string {
    const saved = sessionStorage.getItem(STORAGE_ACTIVE);
    if (saved && tabs.some((t) => t.key === saved)) return saved;
    return tabs[0]?.key ?? '/';
}

export function AdminShellProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(() => sessionStorage.getItem(STORAGE_COLLAPSED) === '1');
    const [tabs, setTabs] = useState<AdminTab[]>(loadStoredTabs);
    const [activeTabKey, setActiveTabKey] = useState(() => loadStoredActive(loadStoredTabs()));
    const [outletRevision, setOutletRevision] = useState(0);

    const persistTabs = useCallback((nextTabs: AdminTab[], nextActive: string) => {
        sessionStorage.setItem(STORAGE_TABS, JSON.stringify(nextTabs));
        sessionStorage.setItem(STORAGE_ACTIVE, nextActive);
    }, []);

    const openTab = useCallback(
        (path: string) => {
            const normalized = normalizeTabPath(path);
            const tab = buildTab(normalized);
            setTabs((prev) => {
                const exists = prev.find((t) => t.key === tab.key);
                const next = exists ? prev : [...prev, tab];
                persistTabs(next, tab.key);
                return next;
            });
            setActiveTabKey(tab.key);
            if (normalizeTabPath(location.pathname) !== tab.path) {
                navigate(tab.path);
            }
        },
        [location.pathname, navigate, persistTabs],
    );

    const switchTab = useCallback(
        (key: string) => {
            const tab = tabs.find((t) => t.key === key);
            if (!tab) return;
            setActiveTabKey(key);
            persistTabs(tabs, key);
            if (normalizeTabPath(location.pathname) !== tab.path) {
                navigate(tab.path);
            }
        },
        [location.pathname, navigate, persistTabs, tabs],
    );

    const closeTab = useCallback(
        (key: string) => {
            const target = tabs.find((t) => t.key === key);
            if (!target || target.affix) return;

            const index = tabs.findIndex((t) => t.key === key);
            const next = tabs.filter((t) => t.key !== key);
            let nextActive = activeTabKey;
            if (activeTabKey === key) {
                const neighbor = next[Math.min(index, next.length - 1)] ?? next[0];
                nextActive = neighbor?.key ?? '/';
                if (neighbor) navigate(neighbor.path);
            }
            setTabs(next);
            setActiveTabKey(nextActive);
            persistTabs(next, nextActive);
        },
        [activeTabKey, navigate, persistTabs, tabs],
    );

    const closeOtherTabs = useCallback(
        (key: string) => {
            setTabs((prev) => {
                const next = prev.filter((t) => t.affix || t.key === key);
                const nextActive = next.some((t) => t.key === key) ? key : next[0]?.key ?? '/';
                setActiveTabKey(nextActive);
                const tab = next.find((t) => t.key === nextActive);
                if (tab) navigate(tab.path);
                persistTabs(next, nextActive);
                return next;
            });
        },
        [navigate, persistTabs],
    );

    const closeLeftTabs = useCallback(
        (key: string) => {
            setTabs((prev) => {
                const index = prev.findIndex((t) => t.key === key);
                if (index < 0) return prev;
                const next = prev.filter((t, i) => t.affix || i >= index);
                const nextActive = next.some((t) => t.key === activeTabKey)
                    ? activeTabKey
                    : (next.find((t) => t.key === key)?.key ?? '/');
                setActiveTabKey(nextActive);
                const tab = next.find((t) => t.key === nextActive);
                if (tab && normalizeTabPath(location.pathname) !== tab.path) navigate(tab.path);
                persistTabs(next, nextActive);
                return next;
            });
        },
        [activeTabKey, location.pathname, navigate, persistTabs],
    );

    const closeRightTabs = useCallback(
        (key: string) => {
            setTabs((prev) => {
                const index = prev.findIndex((t) => t.key === key);
                if (index < 0) return prev;
                const next = prev.filter((t, i) => t.affix || i <= index);
                const nextActive = next.some((t) => t.key === activeTabKey)
                    ? activeTabKey
                    : (next.find((t) => t.key === key)?.key ?? '/');
                setActiveTabKey(nextActive);
                const tab = next.find((t) => t.key === nextActive);
                if (tab && normalizeTabPath(location.pathname) !== tab.path) navigate(tab.path);
                persistTabs(next, nextActive);
                return next;
            });
        },
        [activeTabKey, location.pathname, navigate, persistTabs],
    );

    const closeAllTabs = useCallback(() => {
        const home = buildTab('/');
        setTabs([home]);
        setActiveTabKey(home.key);
        persistTabs([home], home.key);
        navigate(home.path);
    }, [navigate, persistTabs]);

    const refreshCurrentTab = useCallback(() => {
        setOutletRevision((v) => v + 1);
    }, []);

    const toggleCollapsed = useCallback(() => {
        setCollapsed((prev) => {
            const next = !prev;
            sessionStorage.setItem(STORAGE_COLLAPSED, next ? '1' : '0');
            return next;
        });
    }, []);

    useEffect(() => {
        const path = normalizeTabPath(location.pathname);
        setTabs((prev) => {
            if (prev.some((t) => t.key === path)) {
                sessionStorage.setItem(STORAGE_ACTIVE, path);
                return prev;
            }
            const next = [...prev, buildTab(path)];
            sessionStorage.setItem(STORAGE_TABS, JSON.stringify(next));
            sessionStorage.setItem(STORAGE_ACTIVE, path);
            return next;
        });
        setActiveTabKey(path);
    }, [location.pathname]);

    const value = useMemo(
        () => ({
            collapsed,
            setCollapsed,
            toggleCollapsed,
            tabs,
            activeTabKey,
            openTab,
            switchTab,
            closeTab,
            closeOtherTabs,
            closeLeftTabs,
            closeRightTabs,
            closeAllTabs,
            refreshCurrentTab,
            outletRevision,
        }),
        [
            activeTabKey,
            closeAllTabs,
            closeLeftTabs,
            closeOtherTabs,
            closeRightTabs,
            closeTab,
            collapsed,
            openTab,
            outletRevision,
            refreshCurrentTab,
            switchTab,
            tabs,
            toggleCollapsed,
        ],
    );

    return <AdminShellContext.Provider value={value}>{children}</AdminShellContext.Provider>;
}

export function useAdminShell() {
    const ctx = useContext(AdminShellContext);
    if (!ctx) throw new Error('useAdminShell must be used within AdminShellProvider');
    return ctx;
}
