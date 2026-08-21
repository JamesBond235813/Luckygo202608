import type { NotificationRefType } from './notification.constants';
import type { NotificationPayload } from './notification.types';

/** 内置类型默认跳转与图标 */
export const NOTIFICATION_I18N_KEYS: Record<
  string,
  { linkPath: string; icon: string }
> = {
  recharge_success: {
    linkPath: '/wallet',
    icon: 'account_balance_wallet',
  },
  treasure_win: {
    linkPath: '/winnings',
    icon: 'emoji_events',
  },
};

export function buildRechargeSuccessPayload(amount: number): NotificationPayload {
  return { amount };
}

export function buildTreasureWinPayload(input: {
  productTitle: string;
  roundNo?: number | null;
  winningNumber: string;
}): NotificationPayload {
  return {
    product_title: input.productTitle.trim() || '夺宝商品',
    round_no: input.roundNo ?? null,
    winning_number: input.winningNumber,
  };
}

export type NotificationInsertInput = {
  userId: number;
  type: string;
  refType: NotificationRefType;
  refId: number;
  titleZh: string;
  titleEn: string;
  bodyZh: string;
  bodyEn: string;
  linkPath: string;
  icon: string;
  payload: NotificationPayload;
};
