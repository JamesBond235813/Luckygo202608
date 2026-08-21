import type { TranslationKey } from './i18n';

export type AdminRouteMeta = {
    titleKey: TranslationKey;
    parentKey?: TranslationKey;
    /** 固定在标签栏、不可关闭 */
    affix?: boolean;
};

const ROUTES: Record<string, AdminRouteMeta> = {
    '/': { titleKey: 'dashboard', affix: true },
    '/products': { titleKey: 'productList', parentKey: 'productCenter' },
    '/product-categories': { titleKey: 'productCategories', parentKey: 'productCenter' },
    '/campaigns': { titleKey: 'campaigns', parentKey: 'lotteryCenter' },
    '/promo-records': { titleKey: 'orders', parentKey: 'lotteryCenter' },
    '/winnings': { titleKey: 'winnings', parentKey: 'lotteryCenter' },
    '/users': { titleKey: 'users' },
    '/finance/payments': { titleKey: 'paymentRecords', parentKey: 'financeCenter' },
    '/finance/transactions': { titleKey: 'transactionRecords', parentKey: 'financeCenter' },
    '/finance/withdrawals': { titleKey: 'withdrawalRecords', parentKey: 'financeCenter' },
    '/settings/basic': { titleKey: 'systemConfigSectionBasic', parentKey: 'systemConfig' },
    '/settings/invite': { titleKey: 'systemConfigSectionInvite', parentKey: 'systemConfig' },
    '/settings/checkin': { titleKey: 'systemConfigSectionCheckin', parentKey: 'systemConfig' },
    '/settings': { titleKey: 'systemConfig', parentKey: 'systemCenter' },
    '/system/sms': { titleKey: 'smsSendLogs', parentKey: 'systemCenter' },
};

const SETTINGS_SECTIONS: Record<string, TranslationKey> = {
    basic: 'systemConfigSectionBasic',
    invite: 'systemConfigSectionInvite',
    checkin: 'systemConfigSectionCheckin',
};

/** 将 pathname 规范化为标签 key（无尾斜杠） */
export function normalizeTabPath(pathname: string): string {
    if (!pathname || pathname === '/') return '/';
    if (pathname === '/settings' || pathname === '/settings/') return '/settings/basic';
    return pathname.replace(/\/+$/, '') || '/';
}

export function resolveAdminRouteMeta(pathname: string): AdminRouteMeta {
    const path = normalizeTabPath(pathname);
    if (ROUTES[path]) return ROUTES[path];

    if (path.startsWith('/settings/')) {
        const section = path.split('/')[2] ?? 'basic';
        const titleKey = SETTINGS_SECTIONS[section] ?? 'systemConfig';
        return { titleKey, parentKey: 'systemConfig' };
    }

    return { titleKey: 'dashboard', affix: true };
}

export function isMenuParentKey(key: string): boolean {
    return key === 'finance' || key === 'promo' || key === 'products' || key === 'system';
}
