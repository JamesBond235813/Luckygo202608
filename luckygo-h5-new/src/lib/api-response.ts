/** 与服务端一致的统一响应体 */
export interface ApiEnvelope<T = unknown> {
  code: number;
  data: T;
  message: string;
}

/** 接口业务失败（非网络异常），不用 Error 避免控制台堆栈 */
export interface ApiBusinessError {
  readonly __apiBusiness: true;
  code: number;
  message: string;
}

export const createApiBusinessError = (code: number, message: string): ApiBusinessError => ({
  __apiBusiness: true,
  code,
  message,
});

export const isApiBusinessError = (error: unknown): error is ApiBusinessError =>
  !!error &&
  typeof error === 'object' &&
  (error as ApiBusinessError).__apiBusiness === true;

export const isApiEnvelope = (body: unknown): body is ApiEnvelope => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const obj = body as ApiEnvelope;
  return typeof obj.code === 'number' && 'data' in obj && typeof obj.message === 'string';
};

export const isApiFailure = (body: unknown): body is ApiEnvelope => {
  return isApiEnvelope(body) && body.code !== 0;
};

export const unwrapApiData = <T>(body: unknown): T => {
  if (isApiEnvelope(body)) return body.data as T;
  return body as T;
};

export const getEnvelopeErrorMessage = (body: ApiEnvelope, fallback = 'Request failed'): string =>
  body.message || fallback;

/** 从业务错误对象、axios 响应体或网络异常中提取 message */
/** 仅记录非预期的网络/系统错误，业务失败不打控制台 */
export const logUnexpectedApiError = (error: unknown): void => {
  if (!isApiBusinessError(error)) {
    console.error(error);
  }
};

export const getApiErrorMessage = (error: unknown, fallback = 'Request failed'): string => {
  if (isApiBusinessError(error)) return error.message;
  if (error && typeof error === 'object' && 'response' in error) {
    const resData = (error as { response?: { data?: unknown } }).response?.data;
    if (isApiFailure(resData)) return getEnvelopeErrorMessage(resData);
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};
