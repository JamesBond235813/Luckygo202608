import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AdminCampaignsController, CampaignsController } from './campaigns.controller';
import { AUTO_DRAW_QUEUE_NAME } from './auto-draw/auto-draw.constants';
import { AutoDrawProcessor } from './auto-draw/auto-draw.processor';
import { AutoDrawQueueService } from './auto-draw/auto-draw-queue.service';
import { CampaignsAutoDrawScheduler } from './campaigns-auto-draw.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';
import { CampaignsService } from './campaigns.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: AUTO_DRAW_QUEUE_NAME,
    }),
    NotificationsModule,
  ],
  controllers: [CampaignsController, AdminCampaignsController],
  providers: [
    CampaignsService,
    AutoDrawQueueService,
    AutoDrawProcessor,
    CampaignsAutoDrawScheduler,
  ],
  exports: [CampaignsService, AutoDrawQueueService],
})
export class CampaignsModule {}
