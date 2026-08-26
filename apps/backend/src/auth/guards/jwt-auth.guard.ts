import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppError } from '../../core/errors/app-error';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * Map Passport/JWT errors to typed AppErrors so the API always returns
   * a consistent error shape with TOKEN_EXPIRED or TOKEN_INVALID codes.
   */
  handleRequest<TUser>(err: unknown, user: TUser, info: unknown): TUser {
    if (info instanceof TokenExpiredError) {
      throw new AppError('TOKEN_EXPIRED', 'Access token has expired');
    }
    if (info instanceof JsonWebTokenError || err) {
      throw new AppError('TOKEN_INVALID', 'Access token is invalid');
    }
    if (!user) {
      throw new AppError('UNAUTHORIZED', 'Authentication required');
    }
    return user;
  }
}
