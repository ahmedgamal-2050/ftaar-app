/**
 * Mirrors the backend's `SafeUser` (Prisma `User` row minus `passwordHash`,
 * see apps/backend/src/auth/services/user-repository.service.ts). There is no
 * `isGuest` field server-side — callers derive it from `kind`.
 */
export interface AuthUser {
  id: string;
  kind: 'guest' | 'registered';
  displayName: string;
  email: string | null;
  instaPayHandle: string | null;
  emailVerifiedAt: string | null;
}

/** Flat shape returned by guest/login/convert/refresh (see `AuthResponse` in
 * apps/backend/src/auth/auth.service.ts) — tokens are not nested. */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** Every response body is wrapped by the backend's ResponseWrapInterceptor —
 * see apps/backend/src/core/http/response-wrap.interceptor.ts. */
export interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

/** Shape of the typed error codes the backend returns — see
 * apps/backend/src/core/http/all-exceptions.filter.ts and
 * apps/backend/src/core/errors/error-codes.ts. */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ErrorEnvelope {
  success: false;
  error: ApiErrorBody;
  requestId?: string;
}
