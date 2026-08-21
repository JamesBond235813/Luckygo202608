export const CAMPAIGN_STATUSES = [
  'draft',
  'selling',
  'sold_out',
  'drawing',
  'ended',
  'cancelled',
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const DRAW_MODES = ['auto', 'designated'] as const;
export type DrawMode = (typeof DRAW_MODES)[number];

export const LOTTERY_NUMBER_MIN = 100000;
export const LOTTERY_NUMBER_MAX = 999999;

/** 满员自动开奖默认倒计时（秒） */
export const DEFAULT_AUTO_DRAW_COUNTDOWN_SECONDS = 60;

/** 后台扫描到期自动开奖的批次大小 */
export const AUTO_DRAW_BATCH_SIZE = 32;

/** 同一扫描周期内并行处理期次数（多期不同 id 可并行） */
export const AUTO_DRAW_CONCURRENCY = 4;

/** MySQL GET_LOCK 名称前缀（多实例时按 campaignId 互斥） */
export const AUTO_DRAW_MYSQL_LOCK_PREFIX = 'luckygo:auto_draw:';
