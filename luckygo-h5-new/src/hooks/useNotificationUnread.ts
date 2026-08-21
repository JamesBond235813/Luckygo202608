import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import { isH5Authenticated } from '../lib/auth';
export function useNotificationUnread(): { unreadCount: number; refresh: () => void } {
    const [unreadCount, setUnreadCount] = useState(0);

    const refresh = useCallback(() => {
        if (!isH5Authenticated()) {
            setUnreadCount(0);
            return;
        }
        void (async () => {
            try {
                const count = await ApiService.getNotificationUnreadCount();
                setUnreadCount(Math.max(0, count));
            } catch {
                setUnreadCount(0);
            }
        })();
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(refresh, 0);
        const onChange = () => refresh();
        window.addEventListener('luckygo-notifications-change', onChange);
        window.addEventListener('luckygo-auth-change', onChange);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('luckygo-notifications-change', onChange);
            window.removeEventListener('luckygo-auth-change', onChange);
        };
    }, [refresh]);

    return { unreadCount, refresh };
}
