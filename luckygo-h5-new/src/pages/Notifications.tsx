import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppPageNav } from '../components/AppPageNav';
import { AuthEmptyState } from '../components/AuthEmptyState';
import { SegmentTabBar } from '../components/SegmentTabBar';
import { ApiService, getApiErrorMessage } from '../services/api';
import { logUnexpectedApiError } from '../lib/api-response';
import { isH5Authenticated } from '../lib/auth';
import {
    formatNotificationTime,
    notificationIcon,
    pickNotificationBody,
    pickNotificationTitle,
} from '../lib/notification-display';
import {
    NOTIFICATION_READ_FILTERS,
    notificationEmptyMessageKey,
    notificationReadFilterToApi,
    type NotificationReadFilter,
} from '../lib/notification-filter';
import { showSimpleToast } from '../lib/simpleToast';
import { useI18n } from '../lib/useI18n';
import type { UserNotification } from '../types';

const Notifications: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const isLoggedIn = isH5Authenticated();
    const [filter, setFilter] = useState<NotificationReadFilter>('All');
    const [items, setItems] = useState<UserNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [markingAll, setMarkingAll] = useState(false);

    const refreshUnreadCount = useCallback(async () => {
        if (!isLoggedIn) {
            setUnreadCount(0);
            return;
        }
        try {
            const count = await ApiService.getNotificationUnreadCount();
            setUnreadCount(Math.max(0, count));
        } catch {
            setUnreadCount(0);
        }
    }, [isLoggedIn]);

    const load = useCallback(async () => {
        if (!isLoggedIn) {
            setItems([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await ApiService.getUserNotifications(notificationReadFilterToApi(filter));
            setItems(data);
            await refreshUnreadCount();
        } catch (error) {
            logUnexpectedApiError(error);
            showSimpleToast(getApiErrorMessage(error, t('notificationsLoadFailed')));
        } finally {
            setLoading(false);
        }
    }, [filter, isLoggedIn, refreshUnreadCount, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const tabs = useMemo(
        () =>
            NOTIFICATION_READ_FILTERS.map((key) => ({
                key,
                label:
                    key === 'All'
                        ? t('notificationsFilterAll')
                        : key === 'Unread'
                          ? t('notificationsFilterUnread')
                          : t('notificationsFilterRead'),
            })),
        [t],
    );

    const viewItems = useMemo(
        () =>
            items.map((item) => ({
                item,
                title: pickNotificationTitle(item),
                body: pickNotificationBody(item),
            })),
        [items],
    );

    const markOneRead = (item: UserNotification) => {
        if (item.read) return;
        void (async () => {
            try {
                await ApiService.markNotificationsRead([item.id]);
                window.dispatchEvent(new Event('luckygo-notifications-change'));
                if (filter === 'Unread') {
                    setItems((current) => current.filter((row) => row.id !== item.id));
                } else {
                    setItems((current) =>
                        current.map((row) => (row.id === item.id ? { ...row, read: true } : row)),
                    );
                }
                await refreshUnreadCount();
            } catch (error) {
                showSimpleToast(getApiErrorMessage(error, t('notificationsLoadFailed')));
            }
        })();
    };

    const markAllRead = () => {
        if (unreadCount <= 0 || markingAll) return;
        setMarkingAll(true);
        void (async () => {
            try {
                await ApiService.markNotificationsRead();
                showSimpleToast(t('notificationsMarkedRead'));
                window.dispatchEvent(new Event('luckygo-notifications-change'));
                if (filter === 'Unread') {
                    setItems([]);
                } else {
                    setItems((current) => current.map((row) => ({ ...row, read: true })));
                }
                await refreshUnreadCount();
            } catch (error) {
                showSimpleToast(getApiErrorMessage(error, t('notificationsLoadFailed')));
            } finally {
                setMarkingAll(false);
            }
        })();
    };

    const headerRight =
        isLoggedIn && unreadCount > 0 ? (
            <button
                type="button"
                disabled={markingAll}
                onClick={markAllRead}
                className="max-w-[7.5rem] truncate text-xs font-bold text-ghana-green disabled:opacity-50 dark:text-primary"
            >
                {markingAll ? t('commonLoading') : t('notificationsMarkAllRead')}
            </button>
        ) : (
            <span className="w-10" aria-hidden />
        );

    return (
        <div className="flex min-h-screen flex-col bg-gray-100 pb-10 font-display text-gray-900 transition-colors dark:bg-dark-surface dark:text-slate-100">
            <AppPageNav
                title={t('notificationsTitle')}
                onBack={() => navigate('/me')}
                right={headerRight}
            />
            <div className="flex flex-1 flex-col px-4 pt-4">
                {!isLoggedIn ? (
                    <AuthEmptyState from="/notifications" />
                ) : (
                    <>
                        <SegmentTabBar tabs={tabs} value={filter} onChange={setFilter} />
                        {loading ? (
                            <div className="py-16 text-center text-sm text-gray-500 dark:text-slate-400">
                                {t('notificationsLoading')}
                            </div>
                        ) : viewItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                                <span className="material-symbols-outlined text-[48px] text-gray-300 dark:text-slate-600">
                                    notifications_off
                                </span>
                                <p className="text-sm text-gray-500 dark:text-slate-400">
                                    {t(notificationEmptyMessageKey(filter))}
                                </p>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {viewItems.map(({ item, title, body }) => {
                                    const isRecharge = item.type === 'recharge_success';
                                    return (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                disabled={item.read}
                                                onClick={() => markOneRead(item)}
                                                className={`flex w-full gap-3 rounded-2xl border p-4 text-left shadow-sm transition active:scale-[0.99] disabled:cursor-default ${
                                                    item.read
                                                        ? 'border-gray-200 bg-white dark:border-slate-700 dark:bg-dark-card'
                                                        : 'border-ghana-green/30 bg-white ring-1 ring-ghana-green/15 dark:border-ghana-green/40 dark:bg-dark-card'
                                                }`}
                                            >
                                                <div
                                                    className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
                                                        isRecharge
                                                            ? 'bg-ghana-green/10 text-ghana-green'
                                                            : 'bg-primary/15 text-yellow-700 dark:text-primary'
                                                    }`}
                                                >
                                                    <span className="material-symbols-outlined filled text-[22px]">
                                                        {notificationIcon(item)}
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
                                                            {title || '—'}
                                                            {!item.read ? (
                                                                <span className="ml-2 inline-block size-2 align-middle rounded-full bg-ghana-red" />
                                                            ) : null}
                                                        </p>
                                                        <time
                                                            dateTime={item.createdAt}
                                                            className="shrink-0 text-[10px] font-medium text-gray-400 dark:text-slate-500"
                                                        >
                                                            {formatNotificationTime(item.createdAt)}
                                                        </time>
                                                    </div>
                                                    <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-slate-400">
                                                        {body || '—'}
                                                    </p>
                                                    {!isRecharge && item.winningNumber ? (
                                                        <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-500">
                                                            Winning #: {item.winningNumber}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Notifications;
