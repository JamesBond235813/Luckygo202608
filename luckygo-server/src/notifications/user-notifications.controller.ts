import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UserJwtGuard, type RequestWithUser } from '../common/guards/user-jwt.guard';
import { NotificationsService } from './notifications.service';

@Controller('api/users')
export class UserNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('me/notifications')
  @UseGuards(UserJwtGuard)
  list(@Req() req: RequestWithUser, @Query('status') status?: string) {
    const normalized =
      status === 'read' || status === 'unread' ? status : ('all' as const);
    return this.notifications.listForUser(req.user.id, 80, normalized);
  }

  @Get('me/notifications/unread-count')
  @UseGuards(UserJwtGuard)
  async unreadCount(@Req() req: RequestWithUser) {
    const count = await this.notifications.countUnread(req.user.id);
    return { count };
  }

  @Post('me/notifications/read')
  @UseGuards(UserJwtGuard)
  markRead(@Req() req: RequestWithUser, @Body() body: { ids?: Array<number | string> }) {
    const ids = Array.isArray(body?.ids)
      ? body.ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
      : undefined;
    return this.notifications.markRead(req.user.id, ids);
  }
}
