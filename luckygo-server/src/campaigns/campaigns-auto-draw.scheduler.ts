import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { AutoDrawQueueService } from './auto-draw/auto-draw-queue.service';
import { CampaignsService } from './campaigns.service';

/**
 * 补偿调度（非主路径）：
 * - 启动时把 DB 里待开奖期次同步进 Redis 延迟队列
 * - 每分钟扫一次已到期仍未结束的期次（Redis 故障 / 任务丢失时兜底）
 *
 * 秒级准时开奖由 BullMQ 延迟任务负责，不依赖本 Cron 频率。
 */
@Injectable()
export class CampaignsAutoDrawScheduler implements OnModuleInit {
  private readonly logger = new Logger(CampaignsAutoDrawScheduler.name);
  private recoveryInFlight = false;

  constructor(
    private readonly campaigns: CampaignsService,
    private readonly autoDrawQueue: AutoDrawQueueService,
    private readonly config: ConfigService,
  ) {}

  private isRecoveryEnabled(): boolean {
    const v = this.config.get<string>('AUTO_DRAW_RECOVERY_ENABLED', 'true');
    return v !== '0' && v !== 'false' && v !== 'off';
  }

  async onModuleInit(): Promise<void> {
    if (!this.isRecoveryEnabled()) return;
    await this.syncRedisJobs('startup');
    await this.recoverOverdue('startup');
  }

  /** 每分钟：同步 Redis 任务 + 兜底开奖 */
  @Cron('0 * * * * *')
  async handleRecoveryCron(): Promise<void> {
    if (!this.isRecoveryEnabled()) return;
    await this.syncRedisJobs('cron');
    await this.recoverOverdue('cron');
  }

  private async syncRedisJobs(source: string): Promise<void> {
    if (!this.autoDrawQueue.isRedisQueueEnabled()) return;
    try {
      const pending = await this.campaigns.findPendingAutoDrawCampaigns();
      for (const row of pending) {
        await this.autoDrawQueue.scheduleAutoDraw(
          row.id,
          row.sellout_at,
          row.auto_draw_countdown_seconds,
        );
      }
      if (pending.length > 0) {
        this.logger.log(
          `[AutoDraw] SYNC source=schedule-redis trigger=${source} pendingCount=${pending.length}`,
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Auto-draw Redis sync [${source}] failed: ${msg}`);
    }
  }

  private async recoverOverdue(source: string): Promise<void> {
    if (this.recoveryInFlight) return;
    this.recoveryInFlight = true;
    try {
      const batchSource = source === 'startup' ? 'recovery-startup' : 'recovery-cron';
      await this.campaigns.processDueAutoDraws(batchSource);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Auto-draw recovery [${source}] failed: ${msg}`);
    } finally {
      this.recoveryInFlight = false;
    }
  }
}
