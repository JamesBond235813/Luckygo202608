import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { UserJwtGuard } from '../common/guards/user-jwt.guard';
import { AgeConfirmedGuard } from '../common/guards/age-confirmed.guard';
import { UserSelfOrAdminGuard } from '../common/guards/user-self-or-admin.guard';
import { InviteRewardsModule } from './invite-rewards.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, InviteRewardsModule],
  controllers: [UsersController],
  providers: [UsersService, AdminGuard, UserJwtGuard, UserSelfOrAdminGuard, AgeConfirmedGuard],
  exports: [UsersService, AgeConfirmedGuard],
})
export class UsersModule {}
