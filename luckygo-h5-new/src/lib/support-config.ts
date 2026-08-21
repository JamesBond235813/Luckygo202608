/** 与后台 `frontend.general` 共用同一条公开配置 */
export const SUPPORT_CONFIG_SETTING_KEY = 'frontend.general';

export const DEFAULT_MIN_AGE = 18;

export type SupportContactConfig = {
    phone: string;
    email: string;
    whatsapp: string;
};

export type FrontendGeneralPublic = SupportContactConfig & {
    minAge: number;
    /** 首页滚动公告原文（多行；留空则 H5 不展示公告） */
    homeNoticeText: string;
};

export const emptySupportContact = (): SupportContactConfig => ({
    phone: '',
    email: '',
    whatsapp: '',
});

function optionalStr(value: unknown, maxLen: number): string {
    if (value == null) return '';
    return String(value).trim().slice(0, maxLen);
}

function normalizeMinAge(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) return DEFAULT_MIN_AGE;
    return Math.min(120, Math.round(n));
}

export function normalizeSupportContact(raw: unknown): SupportContactConfig {
    const src =
        raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    return {
        phone: optionalStr(src.supportPhone ?? src.support_phone, 32),
        email: optionalStr(src.supportEmail ?? src.support_email, 128),
        whatsapp: optionalStr(src.supportWhatsapp ?? src.support_whatsapp, 32),
    };
}

export function normalizeFrontendGeneral(raw: unknown): FrontendGeneralPublic {
    const support = normalizeSupportContact(raw);
    const src =
        raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    return {
        ...support,
        minAge: normalizeMinAge(src.minAge ?? src.min_age),
        homeNoticeText: optionalStr(src.homeNoticeText ?? src.home_notice_text, 1024),
    };
}

/** 将后台配置的多行公告解析为滚动条目 */
export function parseHomeNoticeMessages(text: string): string[] {
    return text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
}

export function hasSupportContact(config: SupportContactConfig): boolean {
    return Boolean(config.phone || config.email || config.whatsapp);
}

const digitsOnly = (value: string) => value.replace(/\D/g, '');

export function supportPhoneHref(phone: string): string | null {
    const trimmed = phone.trim();
    if (!trimmed) return null;
    const tel = trimmed.startsWith('+') ? `+${digitsOnly(trimmed)}` : digitsOnly(trimmed);
    return tel ? `tel:${tel}` : null;
}

export function supportEmailHref(email: string): string | null {
    const trimmed = email.trim();
    return trimmed ? `mailto:${trimmed}` : null;
}

export function supportWhatsappHref(whatsapp: string): string | null {
    const trimmed = whatsapp.trim();
    if (!trimmed) return null;
    const digits = digitsOnly(trimmed);
    return digits ? `https://wa.me/${digits}` : null;
}
