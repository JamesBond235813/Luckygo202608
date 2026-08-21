/** Ghana local number: support 9 digits, or 10 digits with a leading 0. */
export const GHANA_LOCAL_PHONE_RE = /^(?:\d{9}|0\d{9})$/;

export function normalizeGhanaLocalPhoneInput(value: string): string {
    return value.replace(/\D/g, '').slice(0, 10);
}

export function isValidGhanaLocalPhone(digits: string): boolean {
    return GHANA_LOCAL_PHONE_RE.test(normalizeGhanaLocalPhoneInput(digits));
}

export function toGhanaE164Phone(digits: string): string {
    const normalized = normalizeGhanaLocalPhoneInput(digits);
    const local = normalized.length === 10 && normalized.startsWith('0') ? normalized.slice(1) : normalized;
    return `+233${local}`;
}
