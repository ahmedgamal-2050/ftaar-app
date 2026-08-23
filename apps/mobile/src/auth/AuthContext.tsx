import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthStatus, SessionUser } from './session';

const SESSION_KEY = 'ftaar.localSession';

interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  error: string | null;
  /** Guest session after the ChooseName placeholder. */
  completeOnboarding: (displayName: string) => Promise<void>;
  /** Marks the local session as a registered account — no network. */
  login: () => Promise<void>;
  register: () => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.';
}

async function readSession(): Promise<SessionUser | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw) as Partial<SessionUser>;
  if (
    typeof parsed.displayName !== 'string' ||
    typeof parsed.isGuest !== 'boolean'
  ) {
    return null;
  }

  return { displayName: parsed.displayName, isGuest: parsed.isGuest };
}

async function writeSession(user: SessionUser): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('bootstrapping');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    setStatus('bootstrapping');
    setError(null);
    try {
      const stored = await readSession();
      if (stored) {
        setUser(stored);
        setStatus('ready');
        return;
      }
      setUser(null);
      setStatus('needs-onboarding');
    } catch (err) {
      setError(toErrorMessage(err));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const persistReady = useCallback(async (next: SessionUser) => {
    await writeSession(next);
    setUser(next);
    setStatus('ready');
  }, []);

  const completeOnboarding = useCallback(
    async (displayName: string) => {
      await persistReady({ displayName, isGuest: true });
    },
    [persistReady],
  );

  const login = useCallback(async () => {
    await persistReady({
      displayName: user?.displayName ?? 'Member',
      isGuest: false,
    });
  }, [persistReady, user?.displayName]);

  const register = useCallback(async () => {
    await persistReady({
      displayName: user?.displayName ?? 'Member',
      isGuest: false,
    });
  }, [persistReady, user?.displayName]);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
    setStatus('needs-onboarding');
  }, []);

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
