import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

function extractErrorMessage(raw: string | object): string {
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.error === 'string') return obj.error;
    if (Array.isArray(obj.message)) return obj.message.map(String).join('; ');
    if (typeof obj.message === 'string') return obj.message;
  }
  return 'Request failed';
}

/**
 * 业务/鉴权类错误统一 HTTP 200，由响应体 `code` 区分（非 0 表示失败）。
 * 未捕获的服务器异常仍返回 HTTP 500。
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const error = extractErrorMessage(exception.getResponse());
      res.status(200).json({
        code: status,
        data: null,
        message: error,
      });
      return;
    }

    console.error('[API] Unhandled exception:', exception);
    res.status(500).json({
      code: 500,
      data: null,
      message: 'Internal server error',
    });
  }
}
