import { Module } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { BasicConfigService } from './basic-config.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, BasicConfigService, AdminGuard],
  exports: [SettingsService, BasicConfigService],
})
export class SettingsModule {}
