/** 已知内置通知类型（可扩展任意字符串入库） */
export const NOTIFICATION_TYPE = {
  RECHARGE_SUCCESS: 'recharge_success',
  TREASURE_WIN: 'treasure_win',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE] | string;

export const NOTIFICATION_REF_TYPE = {
  TRANSACTION: 'transaction',
  WINNING: 'winning',
} as const;

export type NotificationRefType =
  (typeof NOTIFICATION_REF_TYPE)[keyof typeof NOTIFICATION_REF_TYPE];
