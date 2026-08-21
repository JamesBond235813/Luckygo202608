import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { CampaignsService } from '../campaigns.service';
import { AUTO_DRAW_QUEUE_NAME, AUTO_DRAW_SCHEDULE_TOLERANCE_MS } from './auto-draw.constants';
import { auditAutoDraw } from './auto-draw-audit';
import type { AutoDrawJobPayload } from './auto-draw-queue.service';

@Processor(AUTO_DRAW_QUEUE_NAME, {
  concurrency: 8,
})
export class AutoDrawProcessor extends WorkerHost {
  private readonly logger = new Logger(AutoDrawProcessor.name);

  constructor(private readonly campaigns: CampaignsService) {
    super();
  }

  async process(job: Job<AutoDrawJobPayload>): Promise<void> {
    const { campaignId, drawAtMs } = job.data;
    const earlyBy = drawAtMs - Date.now();
    if (earlyBy > AUTO_DRAW_SCHEDULE_TOLERANCE_MS) {
      throw new Error(
        `Campaign ${campaignId} draw not due yet (${earlyBy}ms early), will retry`,
      );
    }

    const drawn = await this.campaigns.runAutoDrawIfDue(campaignId, {
      toleranceMs: AUTO_DRAW_SCHEDULE_TOLERANCE_MS,
      source: 'redis-queue',
      jobId: String(job.id ?? ''),
    });
    if (!drawn) {
      const stillPending = await this.campaigns.isPendingAutoDraw(campaignId);
      if (!stillPending) {
        auditAutoDraw(this.logger, 'SKIP', {
          source: 'redis-queue',
          campaignId,
          reason: 'already-ended',
        });
        return;
      }
      throw new Error(`Campaign ${campaignId} auto-draw not completed, will retry`);
    }
  }
}
