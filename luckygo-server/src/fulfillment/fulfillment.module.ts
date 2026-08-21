import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { UserJwtGuard } from '../common/guards/user-jwt.guard';
import { FulfillmentController } from './fulfillment.controller';
import { FulfillmentService } from './fulfillment.service';

@Module({
  imports: [AuthModule],
  controllers: [FulfillmentController],
  providers: [FulfillmentService, AdminGuard, UserJwtGuard],
})
export class FulfillmentModule {}
