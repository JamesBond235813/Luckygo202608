import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { SmsAdminService } from './sms-admin.service';

@Controller('api/admin/sms')
@UseGuards(AdminGuard)
export class SmsAdminController {
  constructor(private readonly sms: SmsAdminService) {}

  @Get('logs')
  listLogs(@Query('limit') limit?: string) {
    return this.sms.listSendLogs(limit ? Number(limit) : 100);
  }
}
