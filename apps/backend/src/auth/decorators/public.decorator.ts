import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route handler as public — skips the global JwtAuthGuard.
 * Usage: @Public() on a controller or individual route method.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
