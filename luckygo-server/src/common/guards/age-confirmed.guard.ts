import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import type { RequestWithUser } from './user-jwt.guard';

/** 充值、夺宝、兑换等：须已在服务端确认成年 */
@Injectable()
export class AgeConfirmedGuard implements CanActivate {
  constructor(private readonly users: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException({
        code: 'AGE_CONFIRMATION_REQUIRED',
        error: 'Adults only. Please confirm your age before continuing.',
      });
    }
    const ok = await this.users.hasAgeConfirmed(userId);
    if (!ok) {
      throw new ForbiddenException({
        code: 'AGE_CONFIRMATION_REQUIRED',
        error: 'Adults only. Please confirm your age before continuing.',
      });
    }
    return true;
  }
}
