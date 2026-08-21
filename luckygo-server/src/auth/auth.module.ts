import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { InviteRewardsModule } from '../users/invite-rewards.module';
import { AuthJwtService } from './auth-jwt.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GhanaSmsConfig } from './ghana/ghana-sms.config';
import { GhanaSmsGateway } from './ghana/ghana-sms.gateway';
import { GhanaSmsOtpStore } from './ghana/ghana-sms-otp.store';
import { GhanaSmsService } from './ghana/ghana-sms.service';

@Module({
  imports: [SmsModule, InviteRewardsModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthJwtService,
    GhanaSmsConfig,
    GhanaSmsOtpStore,
    GhanaSmsGateway,
    GhanaSmsService,
  ],
  exports: [AuthJwtService, GhanaSmsService, GhanaSmsConfig],
})
export class AuthModule {}
