import type { NavigateFunction } from 'react-router-dom';
import { isH5Authenticated } from './auth';
import { showSimpleToast } from './simpleToast';

const LOGIN_REDIRECT_DELAY_MS = 500;

/** 未登录时 toast，延迟后跳转登录页，返回是否已登录 */
export function promptLogin(
    navigate: NavigateFunction,
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
        navigate('/login', { state: { from } });
    }, delayMs);
    return false;
}
