/** BullMQ 队列名 */
export const AUTO_DRAW_QUEUE_NAME = 'campaign-auto-draw';

export const AUTO_DRAW_JOB_NAME = 'run';

/** 延迟任务 jobId（BullMQ 禁止 jobId 含冒号 `:`） */
export function autoDrawJobId(campaignId: number): string {
  return `campaign-auto-draw-${campaignId}`;
}

/** 队列触发允许比计划时刻最多提前的毫秒数（Redis/时钟误差） */
export const AUTO_DRAW_SCHEDULE_TOLERANCE_MS = 500;
