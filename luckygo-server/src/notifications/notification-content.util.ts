import { NOTIFICATION_I18N_KEYS } from './notification-payload.util';

export type NotificationContentFields = {
  titleZh: string;
  titleEn: string;
  bodyZh: string;
  bodyEn: string;
  linkPath: string;
  icon: string;
};

/** 通知文案仅生成英文（title_en / body_en）；中文列留空 */
export function buildRechargeSuccessContent(amount: number): NotificationContentFields {
  const amountText = Number(amount).toFixed(2);
  const meta = NOTIFICATION_I18N_KEYS.recharge_success;
  return {
    titleZh: '',
    titleEn: 'Top-up successful',
    bodyZh: '',
    bodyEn: `You topped up ₵${amountText}. The amount has been added to your wallet.`,
    linkPath: meta.linkPath,
    icon: meta.icon,
  };
}

export function buildTreasureWinContent(input: {
  productTitle: string;
  roundNo?: number | null;
  winningNumber: string;
}): NotificationContentFields {
  const product = input.productTitle.trim() || 'Prize draw';
  const issueSuffix =
    input.roundNo != null && input.roundNo > 0 ? ` (Issue ${input.roundNo})` : '';
  const meta = NOTIFICATION_I18N_KEYS.treasure_win;
  return {
    titleZh: '',
    titleEn: 'You won!',
    bodyZh: '',
    bodyEn: `You won "${product}"${issueSuffix}. Check My Winnings for pickup instructions.`,
    linkPath: meta.linkPath,
    icon: meta.icon,
  };
}
