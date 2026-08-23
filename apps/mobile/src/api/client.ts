import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '../config/env';
import { tokenStore } from './tokenStore';
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
    tokenStore.setAccessToken(session.tokens.accessToken);
    await setRefreshToken(session.tokens.refreshToken);
    return session.tokens.accessToken;
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
    const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/');

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
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
