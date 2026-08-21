import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { InviteRewardsModule } from '../users/invite-rewards.module';
import { UsersModule } from '../users/users.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { UserJwtGuard } from '../common/guards/user-jwt.guard';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule, CampaignsModule, InviteRewardsModule, UsersModule],
  controllers: [OrdersController],
  providers: [OrdersService, AdminGuard, UserJwtGuard],
})
export class OrdersModule {}
