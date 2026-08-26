import type { AuthUser } from '../api/types';
import type { AuthStatus } from './session';
import { toSessionUser } from './session';

function authUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    kind: 'guest',
    email: null,
    displayName: 'Guest',
    instaPayHandle: null,
    emailVerifiedAt: null,
    ...overrides,
  };
}

describe('toSessionUser', () => {
  it('derives isGuest from kind rather than trusting a server-sent flag', () => {
    expect(toSessionUser(authUser({ kind: 'guest' })).isGuest).toBe(true);
    expect(toSessionUser(authUser({ kind: 'registered' })).isGuest).toBe(false);

    const statuses: AuthStatus[] = [
      'bootstrapping',
      'needs-onboarding',
      'ready',
      'error',
    ];
    expect(statuses).toHaveLength(4);
  });

  it('overrides the backend-hardcoded displayName for guests', () => {
    const user = toSessionUser(authUser({ displayName: 'Guest' }), 'Layla');
    expect(user.displayName).toBe('Layla');
  });

  it('falls back to the backend displayName when there is no override', () => {
    const user = toSessionUser(authUser({ displayName: 'Layla' }));
    expect(user.displayName).toBe('Layla');
  });
});
