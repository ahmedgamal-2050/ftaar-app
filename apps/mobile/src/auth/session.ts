/**
 * Local-only session for the navigation shell. Real tokens and API auth land
 * in a later pass — this file exists so Onboarding vs MainTabs can switch
 * without a backend.
 */
export type AuthStatus = 'bootstrapping' | 'needs-onboarding' | 'ready' | 'error';

export interface SessionUser {
  displayName: string;
  isGuest: boolean;
}
