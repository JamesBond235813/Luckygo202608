import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { UserJwtGuard } from '../common/guards/user-jwt.guard';
import { InviteRewardsModule } from '../users/invite-rewards.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { HubtelConfigService } from './hubtel-config.service';
import { HubtelService } from './hubtel.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AuthModule, InviteRewardsModule, UsersModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, HubtelService, HubtelConfigService, AdminGuard, UserJwtGuard],
})
export class PaymentsModule {}
