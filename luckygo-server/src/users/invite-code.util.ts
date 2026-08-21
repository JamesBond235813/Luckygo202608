const INVITE_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const INVITE_CODE_LENGTH = 8;

/** 随机 8 位字母数字邀请码（大小写敏感） */
export function generateRandomInviteCode(length = INVITE_CODE_LENGTH): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * INVITE_CODE_CHARS.length);
    out += INVITE_CODE_CHARS[idx]!;
  }
  return out;
}

export function normalizeInviteCodeInput(raw?: string): string {
  return String(raw ?? '')
    .trim()
    .replace(/\s+/g, '');
}
