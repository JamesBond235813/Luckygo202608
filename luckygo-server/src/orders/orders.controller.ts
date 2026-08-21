import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { AgeConfirmedGuard } from '../common/guards/age-confirmed.guard';
import { UserJwtGuard, type RequestWithUser } from '../common/guards/user-jwt.guard';
import { OrdersService } from './orders.service';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @UseGuards(AdminGuard)
  list() {
    return this.orders.listAll();
  }

  @Post()
  @UseGuards(UserJwtGuard, AgeConfirmedGuard)
  place(
    @Req() req: RequestWithUser,
    @Body() body: { campaignId?: number; productId?: number; count?: number },
  ) {
    return this.orders.placeOrder(req.user.id, body);
  }
}
