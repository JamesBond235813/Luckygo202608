import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { formatLogTimestamp, getLogDateKey } from '../utils/log-datetime';

/** 写入 logs/{subdir}/{YYYY-MM-DD}.log */
export class DailyFileLogger {
  private readonly rootDir: string;

  constructor(
    private readonly subdir: string,
    logDir?: string,
  ) {
    const base = logDir ?? process.env.LOG_DIR ?? 'logs';
    this.rootDir = join(base, subdir);
  }

  append(message: string, date: Date = new Date()): void {
    try {
      mkdirSync(this.rootDir, { recursive: true });
      const filePath = join(this.rootDir, `${getLogDateKey(date)}.log`);
      const firstLine = `${formatLogTimestamp(date)} ${message.split('\n')[0]}`;
      const rest = message.includes('\n') ? `\n${message.split('\n').slice(1).join('\n')}` : '';
      appendFileSync(filePath, `${firstLine}${rest}\n`, 'utf8');
    } catch {
      // 写盘失败不影响业务
    }
  }

  /** 仅写内容，不加时间前缀（如开奖分隔线） */
  appendRaw(message: string, date: Date = new Date()): void {
    try {
      mkdirSync(this.rootDir, { recursive: true });
      const filePath = join(this.rootDir, `${getLogDateKey(date)}.log`);
      appendFileSync(filePath, `${message}\n`, 'utf8');
    } catch {
      // 写盘失败不影响业务
    }
  }
}
