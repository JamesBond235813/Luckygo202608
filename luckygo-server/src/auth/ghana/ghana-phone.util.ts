/** 日志里手机号脱敏 */
export function maskGhanaPhone(e164: string): string {
  if (e164.length < 8) return '***';
  return `${e164.slice(0, 6)}****${e164.slice(-3)}`;
}

/**
 * 规范为 E.164：+233 + 9 位数字（短信网关 / Redis OTP 使用，保持不变）
 */
export function normalizeGhanaPhone(phone: string): string {
  const raw = phone.trim();
  if (!raw) return '';

  if (raw.startsWith('+233')) {
    const rest = raw.slice(4).replace(/\D/g, '');
    if (rest.length === 9) return `+233${rest}`;
    return '';
  }

  const d = raw.replace(/\D/g, '');
  if (!d || d.length < 9) return '';

  if (d.length === 12 && d.startsWith('233')) {
    return `+${d}`;
  }

  if (d.length === 10 && d[0] === '0') {
    return `+233${d.slice(1)}`;
  }

  if (d.length === 9 && /^[0-9]{9}$/.test(d)) {
    return `+233${d}`;
  }

  return '';
}

/** 数据库存储：10 位本地号，0 开头 + 9 位数字 */
export function normalizeGhanaPhoneLocal(phone: string): string {
  const e164 = normalizeGhanaPhone(phone);
  if (!e164) return '';
  return `0${e164.slice(4)}`;
}

export function isValidGhanaE164(phone: string): boolean {
  return /^\+233[0-9]{9}$/.test(phone);
}

export function isValidGhanaLocal(phone: string): boolean {
  return /^0[0-9]{9}$/.test(phone);
}

/** 查询用户时兼容历史 +233 / 233 / 本地 0 开头等写法 */
export function ghanaPhoneLookupVariants(phone: string): string[] {
  const out = new Set<string>();
  const trimmed = phone.trim();
  if (trimmed) out.add(trimmed);

  const local = normalizeGhanaPhoneLocal(trimmed);
  if (local) out.add(local);

  const e164 = normalizeGhanaPhone(trimmed);
  if (e164) {
    out.add(e164);
    out.add(e164.slice(1));
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10 && digits[0] === '0') out.add(digits);
  if (digits.length === 12 && digits.startsWith('233')) {
    out.add(`+${digits}`);
    out.add(digits);
    out.add(`0${digits.slice(3)}`);
  }
  if (digits.length === 9) {
    out.add(`+233${digits}`);
    out.add(`233${digits}`);
    out.add(`0${digits}`);
  }

  return [...out];
}

export function ghanaPhonesEquivalent(a: string, b: string): boolean {
  const la = normalizeGhanaPhoneLocal(a);
  const lb = normalizeGhanaPhoneLocal(b);
  if (la && lb) return la === lb;
  return a.trim() === b.trim();
}
