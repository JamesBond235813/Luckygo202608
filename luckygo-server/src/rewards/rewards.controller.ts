import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { UserJwtGuard, type RequestWithUser } from '../common/guards/user-jwt.guard';
import { AgeConfirmedGuard } from '../common/guards/age-confirmed.guard';
import { RewardsService } from './rewards.service';

@Controller('api/rewards')
@UseGuards(UserJwtGuard)
export class RewardsController {
  constructor(private readonly rewards: RewardsService) {}

  @Get('summary')
  summary(@Req() req: RequestWithUser) {
    return this.rewards.getSummary(req.user.id);
  }

  @Post('checkin')
  @UseGuards(AgeConfirmedGuard)
  checkin(@Req() req: RequestWithUser) {
    return this.rewards.checkin(req.user.id);
  }

  @Post('tasks/:code/claim')
  @UseGuards(AgeConfirmedGuard)
  claimTask(@Req() req: RequestWithUser, @Param('code') code: string) {
    return this.rewards.claimTask(req.user.id, code);
  }
}
