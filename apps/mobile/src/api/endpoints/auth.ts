import { apiClient } from '../client';
import type { AuthSession } from '../types';

export interface BootstrapGuestPayload {
  deviceId: string;
  /** Omitted for a silent re-bootstrap of an already-onboarded guest. */
  displayName?: string;
}

export interface EmailCredentials {
  email: string;
  password: string;
}

/**
 * Typed client for the FR-A auth endpoints. The backend doesn't exist yet
 * (this workspace's mobile foundation is being built ahead of it) — these
 * calls define the contract the app is built against.
 */
export const authApi = {
  bootstrapGuest: (payload: BootstrapGuestPayload) =>
    apiClient.post<AuthSession>('/auth/guest', payload).then((res) => res.data),

  refresh: (refreshToken: string) =>
    apiClient
      .post<AuthSession>('/auth/refresh', { refreshToken })
      .then((res) => res.data),

  login: (payload: EmailCredentials) =>
    apiClient.post<AuthSession>('/auth/login', payload).then((res) => res.data),

  /** Also used for guest -> registered conversion (FR-A.2): when called
   * with an existing guest's access token, the backend updates that user's
   * row instead of inserting a new one. */
  register: (payload: EmailCredentials) =>
    apiClient.post<AuthSession>('/auth/register', payload).then((res) => res.data),
};
