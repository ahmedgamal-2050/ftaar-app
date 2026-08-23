import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

export type AuthUser = {
  id: string;
  kind: string;
  jti: string;
  tokenExpiresAt: Date;
};

/**
 * Extracts the authenticated user (or a specific field) from the request.
 *
 * @example
 * // Full user object
 * @CurrentUser() user: AuthUser
 *
 * @example
 * // Just the user id
 * @CurrentUser('id') userId: string
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('No authenticated user on request');
    }

    return field ? user[field] : user;
  },
);
