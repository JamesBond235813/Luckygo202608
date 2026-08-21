import { Module } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, AdminGuard],
})
export class ProductsModule {}
