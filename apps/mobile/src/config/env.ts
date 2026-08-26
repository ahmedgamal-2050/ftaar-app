/**
 * Centralised access to build-time env vars (see .env.example). Falls back
 * to the local backend's defaults (apps/backend listens on :3000 with the
 * `/api` prefix) so a fresh checkout works against `nx run backend:serve`
 * without extra setup.
 */
export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api',
  socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3000',
} as const;
