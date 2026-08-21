export const NOTIFICATION_READ_FILTERS = ['All', 'Unread', 'Read'] as const;

export type NotificationReadFilter = (typeof NOTIFICATION_READ_FILTERS)[number];

export function notificationReadFilterToApi(
    filter: NotificationReadFilter,
): 'all' | 'unread' | 'read' {
    if (filter === 'Unread') return 'unread';
    if (filter === 'Read') return 'read';
    return 'all';
}

export function notificationEmptyMessageKey(filter: NotificationReadFilter): string {
    if (filter === 'Unread') return 'notificationsEmptyUnread';
    if (filter === 'Read') return 'notificationsEmptyRead';
    return 'notificationsEmpty';
}
