import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiService } from '../services/api';
import { isH5Authenticated } from '../lib/auth';
import { clearUserProfileCache, readUserProfileCache, writeUserProfileCache } from '../lib/userProfileCache';
import type { User } from '../types';

/* The provider and its hook intentionally share this module for context identity. */
/* eslint-disable react-refresh/only-export-components */

export interface UserProfileContextValue {
    /** 当前登录用户信息；未登录或未拉到则为 null */
    user: User | null;
    /** 是否正在请求 / 刷新用户信息 */
    loading: boolean;
    /** 强制从服务端重新拉取并写入缓存 */
    refreshUser: () => Promise<void>;
    /** 本地合并更新（如编辑资料），不请求接口 */
    updateUser: (patch: Partial<User>) => void;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

function readCachedUserIfAuthed(): User | null {
    return isH5Authenticated() ? readUserProfileCache() : null;
}

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(readCachedUserIfAuthed);
    const [loading, setLoading] = useState(false);
    const refreshInFlight = useRef<Promise<void> | null>(null);

    const refreshUser = useCallback(async () => {
        if (refreshInFlight.current) {
            return refreshInFlight.current;
        }

        const run = (async () => {
            if (!isH5Authenticated()) {
                setUser(null);
                clearUserProfileCache();
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const data = await ApiService.getMe();
                setUser(data);
                writeUserProfileCache(data);
            } catch {
                setUser(null);
                clearUserProfileCache();
            } finally {
                setLoading(false);
            }
        })();

        refreshInFlight.current = run;
        try {
            await run;
        } finally {
            refreshInFlight.current = null;
        }
    }, []);

    useEffect(() => {
        if (!isH5Authenticated()) {
            setUser(null);
            clearUserProfileCache();
            return;
        }
        const cached = readUserProfileCache();
        if (cached) {
            setUser(cached);
        }
        // 整页刷新或首次打开应用：始终拉最新 /users/me 并更新内存与 sessionStorage 缓存
        void refreshUser();
    }, [refreshUser]);

    useEffect(() => {
        const onAuth = () => {
            if (!isH5Authenticated()) {
                setUser(null);
                clearUserProfileCache();
                setLoading(false);
                return;
            }
            void refreshUser();
        };
        window.addEventListener('luckygo-auth-change', onAuth);
        return () => window.removeEventListener('luckygo-auth-change', onAuth);
    }, [refreshUser]);

    const updateUser = useCallback((patch: Partial<User>) => {
        setUser((prev) => {
            if (!prev) return null;
            const next = { ...prev, ...patch };
            if (
                patch.totalBalance === undefined &&
                (patch.balance !== undefined || patch.exchangeBalance !== undefined)
            ) {
                next.totalBalance = Number(((next.balance ?? 0) + (next.exchangeBalance ?? 0)).toFixed(2));
            }
            writeUserProfileCache(next);
            return next;
        });
    }, []);

    const value = useMemo(
        () => ({ user, loading, refreshUser, updateUser }),
        [user, loading, refreshUser, updateUser],
    );

    return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile(): UserProfileContextValue {
    const ctx = useContext(UserProfileContext);
    if (!ctx) {
        throw new Error('useUserProfile must be used within UserProfileProvider');
    }
    return ctx;
}
