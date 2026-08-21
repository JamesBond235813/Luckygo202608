import { ConsoleLogger } from '@nestjs/common';
import { formatLogTimestamp } from '../utils/log-datetime';

/** Nest 默认 UTC ISO 前缀改为 LOG_TZ 下的本地运营时间 */
export class LocalConsoleLogger extends ConsoleLogger {
  protected getTimestamp(): string {
    return formatLogTimestamp();
  }
}
