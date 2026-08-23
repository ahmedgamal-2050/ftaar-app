export interface AuthUser {
  id: string;
  displayName: string | null;
  email: string | null;
  isGuest: boolean;
  instapayHandle: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
}

/** Shape of the typed error codes the backend returns (see spec: Errors). */
export interface ApiErrorBody {
  code: string;
  message: string;
}
