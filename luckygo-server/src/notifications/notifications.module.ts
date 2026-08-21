import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserJwtGuard } from '../common/guards/user-jwt.guard';
import { NotificationsService } from './notifications.service';
import { UserNotificationsController } from './user-notifications.controller';

@Module({
  imports: [AuthModule],
  controllers: [UserNotificationsController],
  providers: [NotificationsService, UserJwtGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
