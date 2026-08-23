import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppError } from '../../core/errors/app-error';
import type { AuthUser } from '../decorators/current-user.decorator';

/**
 * Guards routes that require a fully registered user.
 * Guests (kind === 'guest') receive a GUEST_NOT_ALLOWED 403.
 *
 * Apply after JwtAuthGuard — assumes req.user is already populated.
 */
@Injectable()
export class RegisteredUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const user = req.user;

    if (!user || user.kind === 'guest') {
      throw new AppError(
        'GUEST_NOT_ALLOWED',
        'This action requires a registered account. Please sign up to continue.',
      );
    }

    return true;
  }
}
