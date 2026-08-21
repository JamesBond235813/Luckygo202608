import enAll from '../i18n/en';
import zhAll from '../i18n/zh';

export const CURRENCY_CODE = 'GHS';
export const CURRENCY_SYMBOL = '₵';

export const formatCurrency = (value: number | string | null | undefined) => {
    const amount = typeof value === 'number' ? value : Number(value ?? 0);
    return `${amount.toLocaleString('en-GH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}${CURRENCY_SYMBOL}`;
};

export const localLanguages = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' },
    { code: 'tw', label: 'Twi' },
    { code: 'gaa', label: 'Ga' },
    { code: 'ee', label: 'Ewe' },
    { code: 'ha', label: 'Hausa' },
] as const;

export type LocalLanguageCode = (typeof localLanguages)[number]['code'];

const twOverrides: Record<string, string> = {
    home: 'Fie',
    categories: 'Nkyekyɛmu',
    categoriesTitle: 'Nkyekyɛmu',
    categoriesProductsHint: 'Paw nkyekyɛmu wɔ benkum',
    categoriesMore: 'More',
    categoriesMoreTitle: 'All categories',
    categoriesMoreHint: 'Choose a category to browse',
    history: 'Abakosem',
    me: 'Me ho',
    wallet: 'Sika kotoku',
    topUp: 'Fa sika ka ho',
    withdraw: 'Yi sika',
    language: 'Kasa',
    hotPicks: 'Nea eho hia',
    trending: 'Nea agye din',
    viewRules: 'Hwɛ mmara',
    join: 'Fa wo ho hyɛ mu',
    snatchNow: 'Fa no seesei',
    myWallet: 'Me sika kotoku',
    availableBalance: 'Sika a ɛwɔ hɔ',
    helpSupport: 'Mmoa',
};

const gaaOverrides: Record<string, string> = {
    home: 'Shia',
    history: 'Blema sane',
    me: 'Mi',
    wallet: 'Sika wolo',
    topUp: 'Tsɔ sika kɛ',
    withdraw: 'He sika',
    language: 'Gbe',
    hotPicks: 'Nɔ ni yɛ fɛɛ',
    trending: 'Nɔ ni gbɛ',
    viewRules: 'Kɛ lɛ mli sane',
    join: 'Kɛji',
    snatchNow: 'Tsɔ ni',
    myWallet: 'Mi sika wolo',
    availableBalance: 'Sika ni wɔ',
    helpSupport: 'Ye mɔ',
};

const eeOverrides: Record<string, string> = {
    home: 'Aƒe',
    history: 'Ŋutinyawo',
    me: 'Nye',
    wallet: 'Gakpɔ',
    topUp: 'Tsɔ ga kpe ɖe ŋu',
    withdraw: 'Ðe ga',
    language: 'Gbe',
    hotPicks: 'Nu veviewo',
    trending: 'Nu siwo le edzi',
    viewRules: 'Kpɔ seawo',
    join: 'Ge ɖe eme',
    snatchNow: 'Tsɔ fifia',
    myWallet: 'Nye gakpɔ',
    availableBalance: 'Ga si le asinye',
    helpSupport: 'Kpekpeɖeŋu',
};

const haOverrides: Record<string, string> = {
    home: 'Gida',
    history: 'Tarihi',
    me: 'Ni',
    wallet: 'Jakata',
    topUp: 'Kara kudi',
    withdraw: 'Cire kudi',
    language: 'Harshe',
    hotPicks: 'Zabuka masu zafi',
    trending: 'Masu tashe',
    viewRules: 'Duba dokoki',
    join: 'Shiga',
    snatchNow: 'Saya yanzu',
    myWallet: 'Jakata ta',
    availableBalance: 'Kudin da ke akwai',
    helpSupport: 'Taimako',
};

const dictionaries: Record<LocalLanguageCode, Record<string, string>> = {
    en: { ...enAll },
    zh: { ...zhAll },
    tw: { ...enAll, ...twOverrides },
    gaa: { ...enAll, ...gaaOverrides },
    ee: { ...enAll, ...eeOverrides },
    ha: { ...enAll, ...haOverrides },
};

export const getCurrentLanguage = (): LocalLanguageCode => {
    const stored = localStorage.getItem('luckygo_language') as LocalLanguageCode | null;
    return localLanguages.some((item) => item.code === stored) ? stored! : 'en';
};

export const t = (key: string, language: LocalLanguageCode = getCurrentLanguage()) => {
    return dictionaries[language]?.[key] || dictionaries.en[key] || key;
};

const COMPACT_THRESHOLD = 10000;

/** 商品次数/份数等：无逗号；整数无小数；≥1万 → 中文 x.xx万 / 英文 x.xxK */
function formatProductAmountCore(value: number): string {
    const rounded = Math.round(value * 100) / 100;
    if (rounded >= COMPACT_THRESHOLD) {
        const lang = getCurrentLanguage();
        const isZh = lang === 'zh';
        const scaled = isZh ? rounded / 10000 : rounded / 1000;
        return `${scaled.toFixed(2)}${t('currencyCompactSuffix', lang)}`;
    }
    const isInt = Math.abs(rounded - Math.round(rounded)) < 1e-9;
    return isInt ? String(Math.round(rounded)) : rounded.toFixed(2);
}

export const formatProductNumber = (value: number | string | null | undefined): string => {
    const amount = typeof value === 'number' ? value : Number(value ?? 0);
    if (!Number.isFinite(amount)) return '0';
    return formatProductAmountCore(amount);
};

/** 商品金额：同 formatProductNumber，后缀 ₵（如 5₵） */
export const formatCurrencyPlain = (value: number | string | null | undefined) => {
    const amount = typeof value === 'number' ? value : Number(value ?? 0);
    if (!Number.isFinite(amount)) return `0${CURRENCY_SYMBOL}`;
    return `${formatProductAmountCore(amount)}${CURRENCY_SYMBOL}`;
};

/** Replace `{name}` placeholders in a translated string. */
export const tf = (translate: (key: string) => string, key: string, vars: Record<string, string | number> = {}) => {
    let s = translate(key);
    for (const [k, v] of Object.entries(vars)) {
        s = s.split(`{${k}}`).join(String(v));
    }
    return s;
};

/** tf 的商品数字变量（n / sold / total 等）自动 compact */
export const tfProduct = (
    translate: (key: string) => string,
    key: string,
    vars: Record<string, string | number> = {},
) => {
    const formatted: Record<string, string> = {};
    for (const [k, v] of Object.entries(vars)) {
        formatted[k] = typeof v === 'number' ? formatProductNumber(v) : v;
    }
    return tf(translate, key, formatted);
};

/** Map known transaction type enums to i18n; unknown values pass through (may be API-specific). */
export const txTypeLabel = (type: string, translate: (key: string) => string) => {
    const map: Record<string, string> = {
        Recharge: 'txTypeRecharge',
        Spend: 'txTypeSpend',
        Withdraw: 'txTypeWithdraw',
        Reward: 'txTypeReward',
        BeanExchange: 'txTypeBeanExchange',
    };
    const k = map[type];
    if (k) return translate(k);
    if (!type?.trim()) return '';
    return type;
};

export const txStatusLabel = (status: string, translate: (key: string) => string) => {
    const map: Record<string, string> = {
        Success: 'txStatusSuccess',
        Processing: 'txStatusProcessing',
        Failed: 'txStatusFailed',
    };
    const k = map[status];
    return k ? translate(k) : status;
};

export const txStatusColorClass = (status: string): string => {
    if (status === 'Success') return 'text-emerald-600 dark:text-emerald-400';
    if (status === 'Processing') return 'text-amber-600 dark:text-amber-400';
    if (status === 'Failed') return 'text-rose-600 dark:text-rose-400';
    return 'text-gray-700 dark:text-slate-200';
};

export { getCurrentUserId } from './session';
