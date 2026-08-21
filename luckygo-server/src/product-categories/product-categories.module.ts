import { Module } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategoriesService } from './product-categories.service';

@Module({
  controllers: [ProductCategoriesController],
  providers: [ProductCategoriesService, AdminGuard],
})
export class ProductCategoriesModule {}
