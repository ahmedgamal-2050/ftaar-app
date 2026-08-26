import type { AxiosRequestConfig } from 'axios';
import { apiClient, registerSessionExpiredHandler } from './client';
import { setRefreshToken } from '../auth/storage';
import { tokenStore } from './tokenStore';

function unauthorized(config: AxiosRequestConfig) {
  return Object.assign(new Error('Unauthorized'), {
    isAxiosError: true,
    config,
    response: {
      status: 401,
      data: {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'nope' },
      },
      statusText: 'Unauthorized',
      headers: {},
      config,
    },
  });
}

beforeEach(async () => {
  tokenStore.setAccessToken(null);
  await setRefreshToken('family:old-refresh-token');
});

/**
 * A 401 always rejects in this test environment: `refreshAccessToken`'s
 * `await import('./endpoints/auth')` throws under Jest's Node/CJS runtime
 * (dynamic import needs --experimental-vm-modules; Metro handles it fine at
 * runtime, this is a test-only gap). So instead of asserting a full
 * refresh-then-retry round trip, these tests assert the *decision* the
 * interceptor makes — whether it attempts a refresh at all (observable via
 * `onSessionExpired`, which only fires once a refresh attempt has failed).
 * That decision is exactly what regressed: a bearer-authed /auth/* route
 * (convert/logout/me) was being lumped in with public ones (login/guest/
 * register) and skipped entirely, so an expired guest token during
 * conversion 401'd with no retry attempt at all.
 */
describe('apiClient 401 handling', () => {
  it('attempts a refresh for a bearer-authed /auth/* endpoint (e.g. convert)', async () => {
    const onSessionExpired = jest.fn();
    registerSessionExpiredHandler(onSessionExpired);
    apiClient.defaults.adapter = jest.fn((config: AxiosRequestConfig) =>
      Promise.reject(unauthorized(config)),
    );

    await expect(
      apiClient.post('/auth/convert', {
        email: 'a@b.com',
        password: 'Str0ng!Pass',
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(onSessionExpired).toHaveBeenCalled();
  });

  it('does not attempt a refresh for a public /auth/* endpoint (e.g. login)', async () => {
    const onSessionExpired = jest.fn();
    registerSessionExpiredHandler(onSessionExpired);
    apiClient.defaults.adapter = jest.fn((config: AxiosRequestConfig) =>
      Promise.reject(unauthorized(config)),
    );

    await expect(
      apiClient.post('/auth/login', { email: 'a@b.com', password: 'wrong' }),
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('does not attempt a refresh for /auth/refresh itself', async () => {
    const onSessionExpired = jest.fn();
    registerSessionExpiredHandler(onSessionExpired);
    apiClient.defaults.adapter = jest.fn((config: AxiosRequestConfig) =>
      Promise.reject(unauthorized(config)),
    );

    await expect(
      apiClient.post('/auth/refresh', {
        refreshToken: 'family:old-refresh-token',
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('attempts a refresh for a non-auth endpoint', async () => {
    const onSessionExpired = jest.fn();
    registerSessionExpiredHandler(onSessionExpired);
    apiClient.defaults.adapter = jest.fn((config: AxiosRequestConfig) =>
      Promise.reject(unauthorized(config)),
    );

    await expect(apiClient.get('/lobbies/mine')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(onSessionExpired).toHaveBeenCalled();
  });
});
