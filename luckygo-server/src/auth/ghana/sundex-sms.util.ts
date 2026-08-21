import { createHash } from 'crypto';

/** 与 PHP extend/sms/Sms::sign 一致 */
export function buildSundexSign(appId: string, appSecret: string, timestampMs: number): string {
  const signParams: Record<string, string> = {
    appId,
    appSecret,
    timestamp: String(timestampMs),
  };
  const plain = Object.keys(signParams)
    .sort()
    .map((k) => `${k}=${signParams[k]}`)
    .join('&');
  return createHash('md5').update(plain).digest('hex').toUpperCase();
}

/** 与 PHP Sms::template — 按占位符顺序替换 {:code} 等 */
export function renderSmsTemplate(template: string, params: string[]): string {
  const placeholders = [...template.matchAll(/\{:([a-zA-Z0-9_]+)\}/g)].map((m) => m[0]);
  let out = template;
  placeholders.forEach((ph, i) => {
    out = out.split(ph).join(params[i] ?? '');
  });
  return out;
}
