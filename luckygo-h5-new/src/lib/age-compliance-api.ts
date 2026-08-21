import { isApiBusinessError } from './api-response';

export function isAgeConfirmationRequiredError(error: unknown): boolean {
    if (isApiBusinessError(error)) {
        return error.code === 40301 || String(error.message).includes('AGE_CONFIRMATION');
    }
    if (error && typeof error === 'object' && 'response' in error) {
        const data = (error as { response?: { data?: Record<string, unknown> } }).response?.data;
        if (data?.code === 'AGE_CONFIRMATION_REQUIRED') return true;
        const nested = data?.message;
        if (typeof nested === 'object' && nested && 'code' in (nested as object)) {
            return (nested as { code?: string }).code === 'AGE_CONFIRMATION_REQUIRED';
        }
    }
    return false;
}
