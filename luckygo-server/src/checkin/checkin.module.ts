import { Module } from '@nestjs/common';
import { CheckinRewardConfigService } from './checkin-reward-config.service';

@Module({
  providers: [CheckinRewardConfigService],
  exports: [CheckinRewardConfigService],
})
export class CheckinModule {}
