import { Module } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';

@Module({
  controllers: [HistoryController],
  providers: [HistoryService, AdminGuard],
})
export class HistoryModule {}
