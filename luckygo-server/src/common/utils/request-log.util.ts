import type { Request } from 'express';
import type { AuthPayload } from '../types/auth-payload.interface';

const SENSITIVE_KEY = /password|passwd|token|secret|authorization|api[_-]?key/i;

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY.test(key)) return '***';
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return redactRecord(value as Record<string, unknown>);
  }
  return value;
}

function redactRecord(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    out[k] = redactValue(k, v);
  }
  return out;
}

export function collectRequestParams(req: Request): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  const queryKeys = Object.keys(req.query ?? {});
  if (queryKeys.length > 0) {
    params.query = redactRecord(req.query as Record<string, unknown>);
  }

  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    const body = req.body as Record<string, unknown>;
    if (Object.keys(body).length > 0) {
      params.body = redactRecord(body);
    }
  }

  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (file) {
    params.file = {
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
    };
  }

  const files = (req as Request & { files?: Express.Multer.File[] }).files;
  if (Array.isArray(files) && files.length > 0) {
    params.files = files.map((f) => ({
      name: f.originalname,
      size: f.size,
      type: f.mimetype,
    }));
  }

  return params;
}

export function extractRequestUser(req: Request): Record<string, unknown> | undefined {
  const user = (req as Request & { user?: AuthPayload }).user;
  if (!user?.id) return undefined;
  const info: Record<string, unknown> = { userId: user.id };
  if (user.phone) info.phone = user.phone;
  if (user.role) info.role = user.role;
  return info;
}

/** H5 请求日志：首行摘要；user/params 各占一行紧凑 JSON */
export function formatH5RequestLog(level: string, meta: Record<string, unknown>): string {
  const { user, params, ...rest } = meta;
  const headParts: string[] = [];
  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined || v === null) continue;
    headParts.push(`${k}=${v}`);
  }

  const lines = [`[H5] ${level} ${headParts.join(' ')}`];

  if (user && typeof user === 'object') {
    lines.push(`user=${JSON.stringify(user)}`);
  }

  if (params && typeof params === 'object' && Object.keys(params as object).length > 0) {
    lines.push(`params=${JSON.stringify(params)}`);
  }

  return lines.join('\n');
}
