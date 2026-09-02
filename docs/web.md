# Web app (Angular)

Status: **done** in `apps/web`. Discord-inspired shell, Tailwind CSS, wired to the real Nest API under `/api` (and `/health` outside the prefix).

Every surface below issues a real HTTP call — nothing is a local-only placeholder.

## How to run

```sh
npx nx run backend:serve   # API on :3000
npx nx run web:serve       # Angular on :4200, proxies /api and /health
```

The dev server uses `apps/web/proxy.conf.json`, so the browser talks to same-origin `/api` and `/health`. You do not need to set `CORS_ORIGINS` for local proxy traffic. Direct calls to `:3000` from `:4200` are allowed by the backend serve env (`http://localhost:4200`).

## Screens → backend

| Screen / action | Route | Backend |
| --- | --- | --- |
| Welcome → guest | `/welcome` | `POST /api/auth/guest` |
| Register | `/register` | `POST /api/auth/register` |
| Verify OTP / resend | `/verify-otp` | `POST /api/auth/register/verify-otp`, `POST /api/auth/register/resend-otp` |
| Login | `/login` | `POST /api/auth/login` |
| Forgot password | `/forgot` | `POST /api/auth/forgot-password`, `POST /api/auth/forgot-password/verify-otp` |
| Reset password | `/reset` | `POST /api/auth/reset-password` |
| Home ping | `/home` | `GET /api` |
| Ops | `/ops` | `GET /health`, `GET /health/db` |
| Restaurant list / create | `/restaurants` | `GET /api/restaurants`, `POST /api/restaurants` |
| Restaurant + menu | `/restaurants/:id` | `GET /api/restaurants/:id`, `PATCH` / `DELETE /api/restaurants/:id`, `GET /api/restaurants/:id/menu`, `PATCH` / `DELETE /api/menu-items/:id` |
| Add menu (item / bulk) | `/restaurants/:id/menu` | `POST /api/restaurants/:id/menu`, `POST .../menu/bulk` |
| Create / join lobby | `/lobbies` | `POST /api/lobbies`, `POST /api/lobbies/join` |
| Lookup by code | `/lobbies/lookup` | `GET /api/lobbies/code/:code` |
| Lobby room | `/lobbies/:id` | `GET /api/lobbies/:id`, `PATCH .../lock`, `PATCH .../reopen`, `DELETE .../leave`, `DELETE .../members/:memberId` |
| Orders | `/lobbies/:id/orders` | `GET` / `POST` / `PATCH` / `DELETE .../orders/items`, admin `GET .../admin/orders`, `GET .../admin/orders/summary`, `PATCH .../admin/orders/menu-items/:menuItemId/price` |
| Billing | `/lobbies/:id` | `GET .../bill/draft`, `PATCH .../bill/lines`, `POST .../bill/preview`, `POST .../bill/finalise`, `POST .../bill/reopen`, `GET .../bill` |
| Profile | `/account` | `GET /api/auth/me`, `PATCH /api/auth/me`, `POST /api/auth/logout` |
| Convert guest | `/account/convert` | `POST /api/auth/convert` |
| Session restore | boot | `POST /api/auth/refresh` |

Billing identity is the JWT `sub` (BILL-17). The web client no longer sends `x-user-id`.

## Layout

```
apps/web/src/
  styles.css                 # Tailwind v4 + Discord tokens
  app/
    core/api/                # envelope unwrap, 401 refresh, typed FtaarApi
    core/session/            # SessionService + route guards
    layout/                  # Discord server rail + channel list + auth card
    pages/                   # one page per API surface
    ui/ui.ts                 # field / banner primitives
```

## Contract notes

Same as [mobile auth](./mobile-auth.md):

- Success bodies are `{ success: true, data }`. `envelopeInterceptor` unwraps `data`.
- Token pairs are flat `{ accessToken, refreshToken, user }`.
- `user.kind` is `'guest' | 'registered'` (no `isGuest` field).
- Money fields arrive as EGP strings (`"36.87"`).

Refresh token lives in `localStorage` (`ftaar.refreshToken`). Access token stays in memory on `SessionService`.
