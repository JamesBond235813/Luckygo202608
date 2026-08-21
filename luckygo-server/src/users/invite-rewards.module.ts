import { Module } from '@nestjs/common';
import { InviteRewardConfigService } from './invite-reward-config.service';
import { InviteRewardsService } from './invite-rewards.service';

@Module({
  providers: [InviteRewardConfigService, InviteRewardsService],
  exports: [InviteRewardConfigService, InviteRewardsService],
})
export class InviteRewardsModule {}
