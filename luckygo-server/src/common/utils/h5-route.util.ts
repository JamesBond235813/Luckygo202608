/** 判断是否为 H5 端 API（排除管理后台专用路由） */
export function isH5ApiRequest(method: string, originalUrl: string): boolean {
  const path = originalUrl.split('?')[0] || '';
  if (!path.startsWith('/api')) return false;

  if (path.startsWith('/api/admin') || path.startsWith('/api/stats')) {
    return false;
  }
  if (path.startsWith('/api/history/admin') || path.startsWith('/api/settings/admin')) {
    return false;
  }
  if (path.includes('/uploads/admin') || path.includes('/admin/upload')) {
    return false;
  }
  if (path.startsWith('/api/payments/hubtel/config')) {
    return false;
  }
  if (/\/api\/payments\/hubtel\/refund\//.test(path)) {
    return false;
  }

  if (method === 'GET' && path === '/api/users') return false;
  if (method === 'GET' && path === '/api/orders') return false;
  if (method === 'PUT' && /^\/api\/users\/\d+$/.test(path)) return false;
  if (['POST', 'PUT', 'DELETE'].includes(method) && path.startsWith('/api/products')) {
    return false;
  }

  return true;
}
