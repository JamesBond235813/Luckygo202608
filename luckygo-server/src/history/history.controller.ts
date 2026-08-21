import { Body, Controller, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { HistoryService } from './history.service';

@Controller('api/history')
export class HistoryController {
  constructor(private readonly history: HistoryService) {}

  @Get()
  list() {
    return this.history.getPublicHistory();
  }

  @Get('admin/winnings')
  @UseGuards(AdminGuard)
  adminWinnings() {
    return this.history.getAdminWinnings();
  }

  @Put('admin/winnings/:id')
  @UseGuards(AdminGuard)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status?: string },
  ) {
    return this.history.updateWinningStatus(id, body.status ?? 'Processing');
  }
}
