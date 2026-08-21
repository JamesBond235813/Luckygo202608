import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import {
  AUTO_DRAW_JOB_NAME,
  AUTO_DRAW_QUEUE_NAME,
  autoDrawJobId,
} from './auto-draw.constants';
import { formatLogTimestamp } from '../../common/utils/log-datetime';
import { auditAutoDraw } from './auto-draw-audit';
import { DEFAULT_AUTO_DRAW_COUNTDOWN_SECONDS } from '../campaigns.constants';

export interface AutoDrawJobPayload {
  campaignId: number;
  drawAtMs: number;
}

@Injectable()
export class AutoDrawQueueService {
  private readonly logger = new Logger(AutoDrawQueueService.name);

  constructor(
    @InjectQueue(AUTO_DRAW_QUEUE_NAME) private readonly queue: Queue<AutoDrawJobPayload>,
    private readonly config: ConfigService,
  ) {}

  isRedisQueueEnabled(): boolean {
    const v = this.config.get<string>('AUTO_DRAW_REDIS_ENABLED', 'true');
    return v !== '0' && v !== 'false' && v !== 'off';
  }

  /**
   * 满员后按「sellout_at + 倒计时」精确投递延迟任务（秒级准时，不依赖 10s 轮询）。
   */
  async scheduleAutoDraw(
    campaignId: number,
    selloutAt: Date | string,
    countdownSeconds?: number,
  ): Promise<void> {
    if (!this.isRedisQueueEnabled()) {
      this.logger.warn(
        `Redis auto-draw queue disabled; campaign ${campaignId} relies on DB recovery scan only`,
      );
      return;
    }

    const seconds = Number(countdownSeconds) || DEFAULT_AUTO_DRAW_COUNTDOWN_SECONDS;
    const selloutMs = new Date(selloutAt).getTime();
    const drawAtMs = selloutMs + seconds * 1000;
    const delay = Math.max(0, drawAtMs - Date.now());

    const jobId = autoDrawJobId(campaignId);
    const existing = await this.queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'delayed' || state === 'waiting' || state === 'active') {
        const existingDrawAt = existing.data?.drawAtMs;
        if (existingDrawAt === drawAtMs) {
          return;
        }
        await existing.remove();
      }
    }

    await this.queue.add(
      AUTO_DRAW_JOB_NAME,
      { campaignId, drawAtMs },
      {
        jobId,
        delay,
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 604800 },
        attempts: 8,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );

    auditAutoDraw(this.logger, 'SCHEDULE', {
      source: 'schedule-redis',
      campaignId,
      delayMs: delay,
      drawAt: formatLogTimestamp(new Date(drawAtMs)),
      jobId,
    });
  }
}
