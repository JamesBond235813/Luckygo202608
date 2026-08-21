/** 将支付网关返回的相对结账地址补全为可跳转的绝对 URL */
export function resolveCheckoutUrl(raw: unknown, origin = window.location.origin): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const url = raw.trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${origin}${url}`;
  return `${origin}/${url}`;
}
