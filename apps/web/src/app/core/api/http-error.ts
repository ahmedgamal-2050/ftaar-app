import { HttpErrorResponse } from '@angular/common/http';
import type {
  ApiErrorBody,
  ErrorEnvelope,
  ValidationErrorResponse,
} from './types';

function isValidationErrorResponse(
  body: unknown,
): body is ValidationErrorResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as { code?: unknown }).code === 'VALIDATION_ERROR' &&
    Array.isArray((body as { errors?: unknown }).errors)
  );
}

export function getApiError(err: unknown): ApiErrorBody {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as
      | ErrorEnvelope
      | ValidationErrorResponse
      | undefined;
    if (isValidationErrorResponse(body)) {
      return {
        code: body.code,
        message: body.message,
        errors: body.errors,
      };
    }
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
