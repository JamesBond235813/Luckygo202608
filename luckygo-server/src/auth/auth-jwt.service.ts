import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import type { AuthPayload } from '../common/types/auth-payload.interface';

@Injectable()
export class AuthJwtService {
  constructor(private readonly config: ConfigService) {}

  sign(payload: AuthPayload): string {
    const secret = this.config.get<string>('ADMIN_JWT_SECRET', '');
    return jwt.sign(payload, secret, { expiresIn: '7d' });
  }

  verify(token: string): AuthPayload {
    const secret = this.config.get<string>('ADMIN_JWT_SECRET', '');
    return jwt.verify(token, secret) as AuthPayload;
  }
}
