import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserJwtGuard } from '../common/guards/user-jwt.guard';
import { UsersModule } from '../users/users.module';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [RewardsController],
  providers: [RewardsService, UserJwtGuard],
  exports: [RewardsService],
})
export class RewardsModule {}
