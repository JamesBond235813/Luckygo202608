import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CODE_OK } from '../constants/api-response.constants';
import { formatDatesInValue } from '../utils/ghana-datetime';

export interface ApiSuccessBody<T = unknown> {
  code: number;
  data: T;
  message: string;
}

function isEnvelope(data: unknown): data is ApiSuccessBody {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.code === 'number' && 'data' in obj && typeof obj.message === 'string';
}

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiSuccessBody> {
    return next.handle().pipe(
      map((data) => {
        if (isEnvelope(data)) {
          return {
            ...data,
            data: formatDatesInValue(data.data),
          };
        }
        return {
          code: API_CODE_OK,
          data: formatDatesInValue(data ?? null),
          message: 'ok',
        };
      }),
    );
  }
}
