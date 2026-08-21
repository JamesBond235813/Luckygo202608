import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { AgeConfirmedGuard } from '../common/guards/age-confirmed.guard';
import { UserJwtGuard, type RequestWithUser } from '../common/guards/user-jwt.guard';
import { UserSelfOrAdminGuard } from '../common/guards/user-self-or-admin.guard';
import { toH5UserProfile } from './h5-user.util';
import { UsersService } from './users.service';

@Controller('api/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @UseGuards(AdminGuard)
  list() {
    return this.users.findAllForAdmin();
  }

  @Put('by-invite/:code')
  @UseGuards(AdminGuard)
  updateByInvite(
    @Param('code') code: string,
    @Body() body: { balance?: number; exchange_balance?: number; beans?: number; nickname?: string },
  ) {
    return this.users.updateByInviteCode(code, body);
  }

  @Put('by-invite/:code/password')
  @UseGuards(AdminGuard)
  resetPasswordByInvite(
    @Param('code') code: string,
    @Body() body: { password?: string },
  ) {
    return this.users.adminResetPasswordByInviteCode(code, body.password);
  }

  @Get('me')
  @UseGuards(UserJwtGuard)
  async me(@Req() req: RequestWithUser) {
    const row = await this.users.findOne(req.user.id);
    return toH5UserProfile(row as Record<string, unknown>);
  }

  @Get('me/invite-rewards')
  @UseGuards(UserJwtGuard)
  meInviteRewards(@Req() req: RequestWithUser) {
    return this.users.findMyInviteRewards(req.user.id);
  }

  @Get('me/transactions')
  @UseGuards(UserJwtGuard)
  meTransactions(@Req() req: RequestWithUser) {
    return this.users.findTransactions(req.user.id);
  }

  @Get('me/winnings')
  @UseGuards(UserJwtGuard)
  meWinnings(@Req() req: RequestWithUser) {
    return this.users.findWinnings(req.user.id);
  }

  @Get('me/participation')
  @UseGuards(UserJwtGuard)
  meParticipation(@Req() req: RequestWithUser) {
    return this.users.findParticipation(req.user.id);
  }

  /** 金豆兑换为夺宝可用游戏余额（exchange_balance），比例 100:1 */
  @Post('me/confirm-age')
  @UseGuards(UserJwtGuard)
  async confirmAge(@Req() req: RequestWithUser, @Body() body: { policyVersion?: string }) {
    const row = await this.users.confirmAge(req.user.id, body.policyVersion);
    return toH5UserProfile(row as Record<string, unknown>);
  }

  @Post('me/exchange-beans')
  @UseGuards(UserJwtGuard, AgeConfirmedGuard)
  exchangeBeans(@Req() req: RequestWithUser, @Body() body: { beans?: number }) {
    return this.users.exchangeBeansForGameBalance(req.user.id, Number(body.beans));
  }

  @Put('me')
  @UseGuards(UserJwtGuard)
  async updateMe(
    @Req() req: RequestWithUser,
    @Body() body: { nickname?: string; avatar?: string },
  ) {
    const row = await this.users.updateMe(req.user.id, body);
    return toH5UserProfile(row);
  }

  @Put('me/phone')
  @UseGuards(UserJwtGuard)
  async updatePhone(
    @Req() req: RequestWithUser,
    @Body() body: { phone?: string; password?: string },
  ) {
    const row = await this.users.updatePhone(req.user.id, body.phone, body.password);
    return toH5UserProfile(row);
  }

  @Put('me/password')
  @UseGuards(UserJwtGuard)
  async updatePassword(
    @Req() req: RequestWithUser,
    @Body() body: { currentPassword?: string; newPassword?: string },
  ) {
    const row = await this.users.updatePassword(req.user.id, body.currentPassword, body.newPassword);
    return toH5UserProfile(row);
  }

  @Get(':id/transactions')
  @UseGuards(UserSelfOrAdminGuard)
  transactions(@Param('id', ParseIntPipe) id: number) {
    return this.users.findTransactions(id);
  }

  @Get(':id/winnings')
  @UseGuards(UserSelfOrAdminGuard)
  winnings(@Param('id', ParseIntPipe) id: number) {
    return this.users.findWinnings(id);
  }

  @Get(':id/participation')
  @UseGuards(UserSelfOrAdminGuard)
  participation(@Param('id', ParseIntPipe) id: number) {
    return this.users.findParticipation(id);
  }

  @Get(':id')
  @UseGuards(UserSelfOrAdminGuard)
  profile(@Param('id', ParseIntPipe) id: number) {
    return this.users.findOne(id);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { balance?: number; exchange_balance?: number; beans?: number; nickname?: string },
  ) {
    return this.users.update(id, body);
  }
}
