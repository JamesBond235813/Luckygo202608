import 'dotenv/config';
import 'reflect-metadata';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { LocalConsoleLogger } from './common/logging/local-console-logger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  if (!process.env.ADMIN_JWT_SECRET) {
    throw new Error('ADMIN_JWT_SECRET must be configured in .env');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new LocalConsoleLogger(),
    rawBody: true,
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:2088,http://127.0.0.1:2088,http://localhost:2089,http://127.0.0.1:2089')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());

  const port = Number(process.env.PORT ?? 3000);
  console.log('[EBA Promo server] starting on port', port);
  await app.listen(port, '0.0.0.0');
  console.log(`Server is running on port ${port}`);
}

void bootstrap();
