import { HttpErrorResponse } from '@angular/common/http';
import {
  getApiError,
  isSessionInvalidatingAuthError,
  requestPath,
} from './http-error';

describe('getApiError', () => {
  it('reads the backend error envelope', () => {
    const err = new HttpErrorResponse({
      status: 401,
      error: {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Wrong password' },
      },
    });
    expect(getApiError(err)).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: 'Wrong password',
    });
  });

  it('maps a network failure', () => {
    const err = new HttpErrorResponse({ status: 0, url: '/api/auth/login' });
    expect(getApiError(err).code).toBe('NETWORK_ERROR');
  });
});

describe('isSessionInvalidatingAuthError', () => {
  it('detects expired refresh/access tokens', () => {
    const err = new HttpErrorResponse({
      status: 401,
      error: {
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Refresh token has expired' },
      },
    });
    expect(isSessionInvalidatingAuthError(err)).toBe(true);
  });

  it('detects revoked or invalid tokens', () => {
    const err = new HttpErrorResponse({
      status: 401,
      error: {
        success: false,
        error: { code: 'TOKEN_INVALID', message: 'Invalid refresh token' },
      },
    });
    expect(isSessionInvalidatingAuthError(err)).toBe(true);
  });

  it('ignores other 401s and non-401s', () => {
    expect(
      isSessionInvalidatingAuthError(
        new HttpErrorResponse({
          status: 401,
          error: {
            success: false,
            error: { code: 'INVALID_CREDENTIALS', message: 'Wrong password' },
          },
        }),
      ),
    ).toBe(false);
    expect(
      isSessionInvalidatingAuthError(
        new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }),
      ),
    ).toBe(false);
  });
});

describe('requestPath', () => {
  it('strips origin from an absolute url', () => {
    expect(requestPath('http://localhost:4200/api/auth/login')).toBe(
      '/api/auth/login',
    );
  });
});
