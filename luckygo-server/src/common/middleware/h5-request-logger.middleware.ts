import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { DailyFileLogger } from '../logging/daily-file-logger';
import { isH5ApiRequest } from '../utils/h5-route.util';
import {
  collectRequestParams,
  extractRequestUser,
  formatH5RequestLog,
} from '../utils/request-log.util';

@Injectable()
export class H5RequestLoggerMiddleware implements NestMiddleware {
  private readonly h5FileLog: DailyFileLogger;
  private readonly tidHeader: string;

  constructor(private readonly config: ConfigService) {
    const logDir = this.config.get<string>('LOG_DIR', 'logs');
    this.h5FileLog = new DailyFileLogger('h5', logDir);
    this.tidHeader = this.config.get<string>('TID_HEADER_NAME', 'X-Trace-Id') ?? 'X-Trace-Id';
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const incomingTid = req.header(this.tidHeader);
    const tid = incomingTid || randomUUID();
    (req as Request & { tid?: string }).tid = tid;
    res.setHeader(this.tidHeader, tid);

    if (!isH5ApiRequest(req.method, req.originalUrl)) {
      next();
      return;
    }

    const start = Date.now();
    res.on('finish', () => {
      if (req.method === 'OPTIONS') return;

      const meta: Record<string, unknown> = {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration_ms: Date.now() - start,
        tid,
      };

      const user = extractRequestUser(req);
      if (user) meta.user = user;

      const params = collectRequestParams(req);
      if (Object.keys(params).length > 0) meta.params = params;

      const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
      this.h5FileLog.append(formatH5RequestLog(level, meta));
    });

    next();
  }
}
