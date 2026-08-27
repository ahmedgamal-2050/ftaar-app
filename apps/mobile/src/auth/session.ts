import type { AuthUser } from '../api/types';

export type AuthStatus =
  | 'bootstrapping'
  | 'needs-onboarding'
  | 'ready'
  | 'error';

export interface SessionUser {
  id: string;
  displayName: string;
  email: string | null;
  isGuest: boolean;
  instaPayHandle: string | null;
}

/** The backend has no `isGuest` field — it's derived from `kind` here.
 * `displayNameOverride` covers the guest bootstrap case: the backend always
 * stores `'Guest'` server-side (it can't accept a client-chosen name), so the
 * locally-typed name is kept until it can be synced via `PATCH /auth/me`
 * (only possible once the account is registered). */
export function toSessionUser(
  user: AuthUser,
  displayNameOverride?: string,
): SessionUser {
  return {
    id: user.id,
    displayName: displayNameOverride ?? user.displayName,
    email: user.email,
    isGuest: user.kind !== 'registered',
    instaPayHandle: user.instaPayHandle,
  };
}
