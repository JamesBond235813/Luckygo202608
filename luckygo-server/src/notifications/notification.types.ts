import type { NotificationRefType } from './notification.constants';

/** 扩展业务字段（JSON 存库，可选） */
export interface NotificationPayload {
  amount?: number;
  product_title?: string;
  round_no?: number | null;
  winning_number?: string;
}

/** 返回给 H5：中英文文案均来自数据库列，由前端按当前语言选用 */
export interface UserNotificationItem {
  id: string;
  type: string;
  title_zh: string;
  title_en: string;
  body_zh: string;
  body_en: string;
  created_at: string;
  ref_id: number;
  ref_type: NotificationRefType;
  read: boolean;
  read_at?: string | null;
  link_path?: string;
  icon?: string;
  amount?: number;
  product_title?: string;
  round_no?: number | null;
  winning_number?: string;
}
