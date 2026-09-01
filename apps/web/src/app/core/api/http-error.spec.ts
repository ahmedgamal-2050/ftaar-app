import { HttpErrorResponse } from '@angular/common/http';
import { getApiError, requestPath } from './http-error';

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

describe('requestPath', () => {
  it('strips origin from an absolute url', () => {
    expect(requestPath('http://localhost:4200/api/auth/login')).toBe(
      '/api/auth/login',
    );
  });
});
