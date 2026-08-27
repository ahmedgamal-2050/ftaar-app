import { apiClient } from '../client';
import type { AuthSession, AuthUser } from '../types';

export interface EmailCredentials {
  email: string;
  password: string;
}

export interface UpdateMePayload {
  displayName?: string;
  instaPayHandle?: string;
}

export interface MessageResponse {
  message: string;
}

export interface ResetTokenResponse {
  resetToken: string;
}

/** Typed client for the backend's `/auth` endpoints — see
 * apps/backend/src/auth/auth.controller.ts for the source of truth. */
export const authApi = {
  /** No body — the backend mints a brand-new anonymous guest on every call,
   * it does not accept a deviceId. Callers must call this exactly once and
   * persist the returned refreshToken; see AuthContext. */
  bootstrapGuest: () =>
    apiClient.post<AuthSession>('/auth/guest').then((res) => res.data),

  refresh: (refreshToken: string) =>
    apiClient
      .post<AuthSession>('/auth/refresh', { refreshToken })
      .then((res) => res.data),

  login: (payload: EmailCredentials) =>
    apiClient.post<AuthSession>('/auth/login', payload).then((res) => res.data),

  /** Guest -> registered conversion (bearer-authed via the request
   * interceptor). Does not require OTP verification. */
  convert: (payload: EmailCredentials) =>
    apiClient
      .post<AuthSession>('/auth/convert', payload)
      .then((res) => res.data),

  logout: (refreshToken: string) =>
    apiClient
      .post<void>('/auth/logout', { refreshToken })
      .then(() => undefined),

  getMe: () => apiClient.get<AuthUser>('/auth/me').then((res) => res.data),

  updateMe: (payload: UpdateMePayload) =>
    apiClient.patch<AuthUser>('/auth/me', payload).then((res) => res.data),

  /** Always returns the same generic message, whether or not the email is
   * registered (account-enumeration safe) — also how a resend works, there
   * is no separate resend endpoint for this flow. Silently no-ops within
   * the server's cooldown window rather than erroring. */
  forgotPassword: (email: string) =>
    apiClient
      .post<MessageResponse>('/auth/forgot-password', { email })
      .then((res) => res.data),

  verifyForgotPasswordOtp: (email: string, otp: string) =>
    apiClient
      .post<ResetTokenResponse>('/auth/forgot-password/verify-otp', {
        email,
        otp,
      })
      .then((res) => res.data),

  /** Revokes all existing sessions on success — see auth.service.ts. */
  resetPassword: (resetToken: string, newPassword: string) =>
    apiClient
      .post<MessageResponse>('/auth/reset-password', {
        resetToken,
        newPassword,
      })
      .then((res) => res.data),
};
