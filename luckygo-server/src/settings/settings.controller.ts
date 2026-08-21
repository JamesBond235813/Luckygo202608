import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { SettingsService } from './settings.service';

@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('public')
  getPublic() {
    return this.settings.getPublic();
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  getAdmin() {
    return this.settings.getAdmin();
  }

  @Put('admin/:key')
  @UseGuards(AdminGuard)
  upsert(
    @Param('key') key: string,
    @Body() body: { value?: unknown; description?: string; isPublic?: boolean },
  ) {
    return this.settings.upsert(key, body);
  }
}
