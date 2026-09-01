import { HttpErrorResponse } from '@angular/common/http';
import type { ApiErrorBody, ErrorEnvelope } from './types';

export function getApiError(err: unknown): ApiErrorBody {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as ErrorEnvelope | undefined;
    if (body && typeof body === 'object' && body.error?.message) {
      return body.error;
    }
    if (err.status === 0) {
      return {
        code: 'NETWORK_ERROR',
        message:
          'Cannot reach the API. Start the backend with nx run backend:serve.',
      };
    }
    return {
      code: 'HTTP_ERROR',
      message: err.message || `Request failed (${err.status})`,
    };
  }
  return { code: 'UNKNOWN', message: 'Something went wrong.' };
}

export const PUBLIC_AUTH_PATHS = new Set([
  '/api/auth/guest',
  '/api/auth/register',
  '/api/auth/register/verify-otp',
  '/api/auth/register/resend-otp',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/forgot-password/verify-otp',
  '/api/auth/reset-password',
]);

export function requestPath(url: string): string {
  try {
    return new URL(url, 'http://local.invalid').pathname;
  } catch {
    return url;
  }
}
