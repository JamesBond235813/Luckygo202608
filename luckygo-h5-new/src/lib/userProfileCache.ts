import type { User } from '../types';
import { getCurrentUserId } from './session';

const CACHE_KEY = 'luckygo_user_profile';

export function readUserProfileCache(): User | null {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const user = JSON.parse(raw) as User;
        if (!user?.id) return null;
        const currentId = getCurrentUserId();
        if (currentId && user.id !== currentId) return null;
        if (typeof user.totalBalance !== 'number' || Number.isNaN(user.totalBalance)) {
            user.totalBalance = Number(((user.balance ?? 0) + (user.exchangeBalance ?? 0)).toFixed(2));
        }
        return user;
    } catch {
        return null;
    }
}

export function writeUserProfileCache(user: User): void {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(user));
}

export function clearUserProfileCache(): void {
    sessionStorage.removeItem(CACHE_KEY);
}
