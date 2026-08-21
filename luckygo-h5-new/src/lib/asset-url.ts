/** 商品/头像等图片地址（支持 OSS 绝对地址与历史 /uploads 路径） */
export function resolveAssetUrl(url?: string | null): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) {
    return import.meta.env.VITE_LOCAL_ONLY === 'true' ? '/logo.png' : url;
  }
  if (url.startsWith('/uploads')) {
    const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
    if (apiBase) {
      const origin = apiBase.replace(/\/api\/?$/, '');
      return `${origin}${url}`;
    }
  }
  return url;
}
