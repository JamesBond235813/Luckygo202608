/** 从 H5 JWT 解析用户 id（登录接口不再返回 user.id） */
export function parseUserIdFromToken(token: string): string {
  const part = token.split('.')[1];
  if (!part) throw new Error('Invalid token');
  const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { id?: number };
  if (json.id == null) throw new Error('Invalid token payload');
  return String(json.id);
}
