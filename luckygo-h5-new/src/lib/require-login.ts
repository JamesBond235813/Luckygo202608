import type { NavigateFunction } from 'react-router-dom';
import { isH5Authenticated } from './auth';
import { showSimpleToast } from './simpleToast';

const LOGIN_REDIRECT_DELAY_MS = 500;

/** 未登录时提示并打开全局登录弹窗，返回是否已登录 */
export function promptLogin(
    _navigate: NavigateFunction,
    message: string,
    fromPath?: string,
    delayMs: number = LOGIN_REDIRECT_DELAY_MS,
): boolean {
    if (isH5Authenticated()) {
        return true;
    }
    showSimpleToast(message);
    const from =
        fromPath ??
        (typeof window !== 'undefined'
            ? `${window.location.pathname}${window.location.search}`
            : '/');
    window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('luckygo-open-login', { detail: { from } }));
    }, delayMs);
    return false;
}
