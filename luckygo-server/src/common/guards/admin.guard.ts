import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import type { AuthPayload } from '../types/auth-payload.interface';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({ error: 'Unauthorized' });
    }
    const token = authHeader.slice(7);
    const secret = this.config.get<string>('ADMIN_JWT_SECRET', '');
    try {
      const decoded = jwt.verify(token, secret) as AuthPayload;
      if (decoded.role !== 'admin') {
        throw new ForbiddenException({ error: 'Forbidden' });
      }
      (req as Request & { user: AuthPayload }).user = decoded;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException({ error: 'Invalid token' });
    }
  }
}
