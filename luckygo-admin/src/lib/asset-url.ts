/** Resolve product/campaign image URLs for display (OSS https, legacy /uploads, or absolute URLs). */
export function resolveAssetUrl(url?: string | null): string {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/uploads') || url.startsWith('uploads/')) {
        const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
        if (apiBase) {
            const origin = apiBase.replace(/\/api\/?$/, '');
            return `${origin}${url}`;
        }
        return url;
    }
    return url;
}
