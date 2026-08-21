import { Body, Controller, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { UserJwtGuard, type RequestWithUser } from '../common/guards/user-jwt.guard';
import { FulfillmentService } from './fulfillment.service';

@Controller('api')
export class FulfillmentController {
  constructor(private readonly fulfillment: FulfillmentService) {}

  @Post('users/me/winnings/:id/fulfillment')
  @UseGuards(UserJwtGuard)
  submit(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { type?: string; name?: string; phone?: string; address?: string; note?: string },
  ) {
    return this.fulfillment.submit(req.user.id, id, body);
  }

  @Put('admin/winnings/:id/fulfillment')
  @UseGuards(AdminGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status?: string; note?: string },
  ) {
    return this.fulfillment.updateByAdmin(id, body.status, body.note);
  }
}
