import { Module } from '@nestjs/common';
import { RootController } from './root.controller';

/** 根路径 `/`：健康检查文案与旧 Express 服务保持一致。 */
@Module({
  controllers: [RootController],
})
export class RootModule {}
