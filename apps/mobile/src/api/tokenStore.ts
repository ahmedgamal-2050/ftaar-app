/**
 * In-memory holder for the current access token. Kept out of React state so
 * the axios interceptor (which runs outside the component tree) can read it
 * synchronously; `AuthContext` is the only writer.
 */
let accessToken: string | null = null;

export const tokenStore = {
  getAccessToken(): string | null {
    return accessToken;
  },
  setAccessToken(token: string | null): void {
    accessToken = token;
  },
};
