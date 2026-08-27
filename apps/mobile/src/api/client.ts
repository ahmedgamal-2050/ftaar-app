import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '../config/env';
import { tokenStore } from './tokenStore';
import type { ApiErrorBody, ErrorEnvelope, SuccessEnvelope } from './types';
import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from '../auth/storage';

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

/** Unwraps the backend's `{ success: true, data }` envelope so every call
 * site works with the real payload directly. */
apiClient.interceptors.response.use((response) => {
  const body = response.data as SuccessEnvelope<unknown> | undefined;
  if (body && typeof body === 'object' && body.success === true) {
    response.data = body.data;
  }
  return response;
});

/** Reads `{ code, message }` off an `AxiosError` from this client, whether
 * it hit the backend's `{ success: false, error }` envelope or failed before
 * a response was ever received. */
export function getApiError(err: unknown): ApiErrorBody {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ErrorEnvelope | undefined;
    if (body?.error) {
      return body.error;
    }
  }
  return { code: 'NETWORK_ERROR', message: 'Something went wrong.' };
}

/** Endpoints that take no bearer token (or, for /auth/refresh, ARE the
 * refresh call itself) — a 401 from one of these is never "your access
 * token expired," so retrying after a refresh would be pointless. Every
 * other /auth/* route (convert, logout, me) is bearer-authed and must go
 * through the normal refresh-and-retry path below like any other endpoint. */
const PUBLIC_AUTH_ENDPOINTS = new Set([
  '/auth/guest',
  '/auth/register',
  '/auth/register/verify-otp',
  '/auth/register/resend-otp',
  '/auth/login',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/forgot-password/verify-otp',
  '/auth/reset-password',
]);

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let onSessionExpired: (() => void) | null = null;

/** AuthContext registers itself here so a failed refresh can drop the app
 * back to onboarding instead of leaving it stuck making 401 requests. */
export function registerSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return null;
  }
  try {
    // Deferred import breaks the client.ts <-> endpoints/auth.ts cycle
    // (auth.ts imports apiClient from this file).
    const { authApi } = await import('./endpoints/auth');
    const session = await authApi.refresh(refreshToken);
    tokenStore.setAccessToken(session.accessToken);
    await setRefreshToken(session.refreshToken);
    return session.accessToken;
  } catch {
    await clearRefreshToken();
    tokenStore.setAccessToken(null);
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined;
    const isPublicAuthEndpoint =
      !!originalRequest?.url && PUBLIC_AUTH_ENDPOINTS.has(originalRequest.url);

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isPublicAuthEndpoint
    ) {
      originalRequest._retry = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;

      if (newToken) {
        originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
        return apiClient(originalRequest);
      }
      onSessionExpired?.();
    }

    return Promise.reject(error);
  },
);
