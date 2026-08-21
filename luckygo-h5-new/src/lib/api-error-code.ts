import { isApiFailure } from './api-response';

export function getApiErrorCode(error: unknown): string | null {
    if (error && typeof error === 'object' && 'response' in error) {
        const resData = (error as { response?: { data?: unknown } }).response?.data;
        if (resData && typeof resData === 'object' && !Array.isArray(resData)) {
            const code = (resData as { code?: unknown }).code;
            if (typeof code === 'string' && code.trim()) return code.trim();
        }
        if (isApiFailure(resData)) {
            const nested = resData.data;
            if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
                const code = (nested as { code?: unknown }).code;
                if (typeof code === 'string' && code.trim()) return code.trim();
            }
        }
    }
    return null;
}
