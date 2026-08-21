import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AdminGuard } from '../common/guards/admin.guard';
import { AgeConfirmedGuard } from '../common/guards/age-confirmed.guard';
import { UserJwtGuard, type RequestWithUser } from '../common/guards/user-jwt.guard';
import { PaymentsService } from './payments.service';
import { assertHubtelCallbackSignature } from './hubtel-callback.util';

@Controller('api/payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  @Get('hubtel/config')
  @UseGuards(AdminGuard)
  getHubtelConfig() {
    return this.payments.getHubtelConfig();
  }

  @Put('hubtel/config')
  @UseGuards(AdminGuard)
  saveHubtelConfig(@Body() body: Record<string, unknown>) {
    return this.payments.saveHubtelConfig(body);
  }

  @Post('hubtel/initiate')
  @UseGuards(UserJwtGuard, AgeConfirmedGuard)
  initiate(
    @Req() req: RequestWithUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.payments.initiateHubtel(req.user.id, body as Parameters<PaymentsService['initiateHubtel']>[1]);
  }

  @Get('hubtel/status/:checkoutId')
  @UseGuards(UserJwtGuard)
  status(
    @Param('checkoutId') checkoutId: string,
    @Query('clientReference') clientReference?: string,
  ) {
    return this.payments.queryHubtelStatus(checkoutId, clientReference);
  }

  /** H5 支付回跳后确认入账（查 Hubtel 状态 + 幂等加余额） */
  @Post('hubtel/confirm')
  @UseGuards(UserJwtGuard, AgeConfirmedGuard)
  confirm(
    @Req() req: RequestWithUser,
    @Body() body: { checkoutId?: string; clientReference?: string },
  ) {
    return this.payments.confirmHubtel(req.user.id, body.checkoutId, body.clientReference);
  }

  @Post('hubtel/refund/:checkoutId')
  @UseGuards(AdminGuard)
  refund(@Param('checkoutId') checkoutId: string) {
    return this.payments.refundHubtel(checkoutId);
  }

  @Post('hubtel/callback')
  callback(@Req() req: Request & { rawBody?: Buffer }, @Body() body: Record<string, unknown>) {
    assertHubtelCallbackSignature(
      req.rawBody,
      String(req.headers['x-hubtel-signature'] ?? req.headers['x-signature'] ?? ''),
      this.config.get<string>('HUBTEL_CALLBACK_SECRET'),
      this.config.get<string>('HUBTEL_MODE', 'production') === 'production',
    );
    return this.payments.handleHubtelCallback(body);
  }

  @Post('hubtel/refund-callback')
  refundCallback(@Req() req: Request & { rawBody?: Buffer }, @Body() body: Record<string, unknown>) {
    assertHubtelCallbackSignature(
      req.rawBody,
      String(req.headers['x-hubtel-signature'] ?? req.headers['x-signature'] ?? ''),
      this.config.get<string>('HUBTEL_CALLBACK_SECRET'),
      this.config.get<string>('HUBTEL_MODE', 'production') === 'production',
    );
    return this.payments.handleHubtelRefundCallback(body);
  }
}
