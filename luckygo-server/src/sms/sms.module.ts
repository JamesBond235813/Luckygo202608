import { Module } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { SmsAdminController } from './sms-admin.controller';
import { SmsAdminService } from './sms-admin.service';
import { SmsSendLogService } from './sms-send-log.service';

@Module({
  controllers: [SmsAdminController],
  providers: [SmsAdminService, SmsSendLogService, AdminGuard],
  exports: [SmsSendLogService],
})
export class SmsModule {}
