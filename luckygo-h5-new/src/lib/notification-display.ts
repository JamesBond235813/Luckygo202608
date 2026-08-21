import type { UserNotification } from '../types';

/** 通知正文固定使用数据库英文字段 */
export function pickNotificationTitle(notification: UserNotification): string {
    return (notification.titleEn || notification.titleZh).trim();
}

export function pickNotificationBody(notification: UserNotification): string {
    return (notification.bodyEn || notification.bodyZh).trim();
}

export function formatNotificationTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString('en-GH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function notificationIcon(notification: UserNotification): string {
    return notification.icon || 'notifications';
}
