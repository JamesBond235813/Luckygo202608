import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { H5RequestLoggerMiddleware } from './common/middleware/h5-request-logger.middleware';
import { DatabaseModule } from './database/database.module';
import { HistoryModule } from './history/history.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { FinanceModule } from './finance/finance.module';
import { CheckinModule } from './checkin/checkin.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';
import { ProductsModule } from './products/products.module';
import { RootModule } from './root/root.module';
import { SettingsModule } from './settings/settings.module';
import { SmsModule } from './sms/sms.module';
import { StatsModule } from './stats/stats.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadsModule } from './uploads/uploads.module';
import { RewardsModule } from './rewards/rewards.module';
import { FulfillmentModule } from './fulfillment/fulfillment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', '127.0.0.1'),
          port: Number(config.get<string>('REDIS_PORT', '6379')),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          db: Number(config.get<string>('REDIS_DB', '0')),
        },
      }),
    }),
    DatabaseModule,
    RootModule,
    AuthModule,
    ProductsModule,
    ProductCategoriesModule,
    CheckinModule,
    CampaignsModule,
    UsersModule,
    NotificationsModule,
    OrdersModule,
    HistoryModule,
    StatsModule,
    SettingsModule,
    SmsModule,
    PaymentsModule,
    FinanceModule,
    UploadsModule,
    RewardsModule,
    FulfillmentModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(H5RequestLoggerMiddleware).forRoutes('*');
  }
}
