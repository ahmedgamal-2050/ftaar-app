import type { AuthStatus, SessionUser } from './session';

describe('session types', () => {
  it('models a guest or registered local user', () => {
    const guest: SessionUser = { displayName: 'Layla', isGuest: true };
    const registered: SessionUser = { displayName: 'Layla', isGuest: false };
    const statuses: AuthStatus[] = [
      'bootstrapping',
      'needs-onboarding',
      'ready',
      'error',
    ];

    expect(guest.isGuest).toBe(true);
    expect(registered.isGuest).toBe(false);
    expect(statuses).toHaveLength(4);
  });
});
