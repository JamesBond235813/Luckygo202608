import { isAgeConfirmationRequiredError } from './age-compliance-api';
import { isApiBusinessError } from './api-response';
import { clearSession, getAccessToken, setSession, type H5SessionPayload } from './session';
import { clearUserProfileCache } from './userProfileCache';

/** 登录时账号不存在，或后端误返回「注册须确认年龄」类文案 */
export function isLoginRequiresRegisterFirstError(error: unknown, message: string): boolean {
  const msg = message.trim();
  if (!msg) return false;

  const lower = msg.toLowerCase();
  if (
    /not\s+registered|no\s+account|account\s+not\s+found|user\s+not\s+found|please\s+register|register\s+first|尚未注册|请先注册|未注册/.test(
      lower,
    )
  ) {
    return true;
  }

  if (/\bregister\b/.test(lower) && /\b(18|age|older|confirm|minimum)\b/.test(lower)) {
    return true;
  }

  if (isAgeConfirmationRequiredError(error)) {
    return true;
  }

  if (isApiBusinessError(error) && error.code === 40401) {
    return true;
  }

  return false;
}

export const isH5Authenticated = (): boolean => Boolean(getAccessToken());

/** 写入登录态（密码登录/注册成功后调用） */
export const persistH5Login = (payload: H5SessionPayload): void => {
  setSession(payload);
  window.dispatchEvent(new Event('luckygo-auth-change'));
};

export const logoutH5 = (): void => {
  clearSession();
  clearUserProfileCache();
  window.dispatchEvent(new Event('luckygo-auth-change'));
};
