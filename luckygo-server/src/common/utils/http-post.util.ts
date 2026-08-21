import * as http from 'node:http';
import * as https from 'node:https';
import { URL } from 'node:url';

/** Node 16 兼容：不依赖全局 fetch */
export function requestJson(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    /** 与 PHP Guzzle timeout 30s 对齐 */
    timeoutMs?: number;
  } = {},
): Promise<{ status: number; text: string }> {
  const method = (options.method ?? 'POST').toUpperCase();
  const parsed = new URL(url);
  const payload = options.body !== undefined ? JSON.stringify(options.body) : '';
  const isHttps = parsed.protocol === 'https:';
  const lib = isHttps ? https : http;

  const timeoutMs = options.timeoutMs ?? 30_000;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method,
        timeout: timeoutMs,
        headers: {
          Accept: 'application/json',
          ...(payload
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
              }
            : {}),
          ...options.headers,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            text: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

export function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; text: string }> {
  return requestJson(url, { method: 'POST', body, headers });
}
