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

/** H5 端用户：JWT 有效且 role 为 user（下单、充值、/users/me 等） */
@Injectable()
export class UserJwtGuard implements CanActivate {
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
      if (decoded.role !== 'user') {
        throw new ForbiddenException({ error: 'Customer token required' });
      }
      req.user = decoded;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException({ error: 'Invalid token' });
    }
  }
}
