import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthJwtService } from '../../auth/auth-jwt.service';
import type { AuthPayload } from '../types/auth-payload.interface';

export type RequestWithUser = Request & { user: AuthPayload };

/** 管理员可访问任意用户；普通用户仅能访问自己的 id */
@Injectable()
export class UserSelfOrAdminGuard implements CanActivate {
  constructor(private readonly jwt: AuthJwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({ error: 'Unauthorized' });
    }
    const token = authHeader.slice(7);
    try {
      const decoded = this.jwt.verify(token);
      const rawId = req.params['id'];
      const targetId = Number(rawId);
      if (!Number.isFinite(targetId) || targetId <= 0) {
        throw new ForbiddenException({ error: 'Invalid user id' });
      }
      if (decoded.role === 'admin') {
        req.user = decoded;
        return true;
      }
      if (decoded.role === 'user' && decoded.id === targetId) {
        req.user = decoded;
        return true;
      }
      throw new ForbiddenException({ error: 'Forbidden' });
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException({ error: 'Invalid token' });
    }
  }
}
