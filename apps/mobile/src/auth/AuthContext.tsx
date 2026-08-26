import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authApi } from '../api/endpoints/auth';
import { registerSessionExpiredHandler } from '../api/client';
import { tokenStore } from '../api/tokenStore';
import type { AuthSession } from '../api/types';
import type { AuthStatus, SessionUser } from './session';
import { toSessionUser } from './session';
import {
  clearGuestDisplayName,
  clearRefreshToken,
  getGuestDisplayName,
  getRefreshToken,
  setGuestDisplayName,
  setRefreshToken,
} from './storage';

interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  error: string | null;
  /** Bootstraps a guest session (POST /auth/guest) and locally caches the
   * typed display name, since the backend can't store one for guests. */
  completeOnboarding: (displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  /** Converts the current guest to a registered account (POST /auth/convert)
   * and syncs the carried-over display name via PATCH /auth/me. */
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('bootstrapping');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applySession = useCallback(
    async (session: AuthSession, displayNameOverride?: string) => {
      tokenStore.setAccessToken(session.accessToken);
      await setRefreshToken(session.refreshToken);
      setUser(toSessionUser(session.user, displayNameOverride));
      setStatus('ready');
    },
    [],
  );

  const resetToOnboarding = useCallback(async () => {
    await clearRefreshToken();
    await clearGuestDisplayName();
    tokenStore.setAccessToken(null);
    setUser(null);
    setStatus('needs-onboarding');
  }, []);

  const bootstrap = useCallback(async () => {
    setStatus('bootstrapping');
    setError(null);
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        setUser(null);
        setStatus('needs-onboarding');
        return;
      }
      try {
        const session = await authApi.refresh(refreshToken);
        const displayNameOverride =
          session.user.kind === 'guest'
            ? ((await getGuestDisplayName()) ?? undefined)
            : undefined;
        await applySession(session, displayNameOverride);
      } catch {
        // Expired/revoked refresh token — this is the normal steady state
        // for a logged-out device, not an exceptional failure.
        await resetToOnboarding();
      }
    } catch (err) {
      setError(toErrorMessage(err));
      setStatus('error');
    }
  }, [applySession, resetToOnboarding]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(
    () => registerSessionExpiredHandler(() => void resetToOnboarding()),
    [resetToOnboarding],
  );

  const completeOnboarding = useCallback(
    async (displayName: string) => {
      const session = await authApi.bootstrapGuest();
      await setGuestDisplayName(displayName);
      await applySession(session, displayName);
    },
    [applySession],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login({ email, password });
      await clearGuestDisplayName();
      await applySession(session);
    },
    [applySession],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const displayName = user?.displayName;
      const session = await authApi.convert({ email, password });
      tokenStore.setAccessToken(session.accessToken);
      await setRefreshToken(session.refreshToken);

      let finalUser = session.user;
      if (displayName) {
        try {
          finalUser = await authApi.updateMe({ displayName });
        } catch {
          // Best-effort — the account is registered either way; the name
          // sync can be retried later from the profile screen.
        }
      }

      await clearGuestDisplayName();
      setUser(toSessionUser(finalUser));
      setStatus('ready');
    },
    [user?.displayName],
  );

  const logout = useCallback(async () => {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Best-effort — still drop the local session even if this fails.
      }
    }
    await resetToOnboarding();
  }, [resetToOnboarding]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      error,
      completeOnboarding,
      login,
      register,
      logout,
      retry: bootstrap,
    }),
    [
      status,
      user,
      error,
      completeOnboarding,
      login,
      register,
      logout,
      bootstrap,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
