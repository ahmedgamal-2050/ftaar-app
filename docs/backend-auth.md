# Auth (AUTH-01–AUTH-17, USER-01–USER-03)

Status: **done** in `apps/backend/src/auth`. Mapped from `PLAN.md`.

Global `JwtAuthGuard` is registered in `AppModule`. Routes without `@Public()` require `Authorization: Bearer <accessToken>`. Catalog writes and lobby create also use `RegisteredUserGuard` (`GUEST_NOT_ALLOWED`). Lobbies, orders, and billing take the actor from `@CurrentUser('id')` (JWT `sub`).

OTP hashing, TTL, attempt caps, and resend cooldown are documented in [Authentication / OTP security audit](./auth-otp-security-audit.md).

## Task checklist

| ID      | Task                         | Done when                                                      |
| ------- | ---------------------------- | -------------------------------------------------------------- |
| AUTH-01 | `RefreshToken` model         | Migration; family id; reuse detection                          |
| AUTH-02 | `PasswordService`            | bcrypt hash/compare; dummy compare on missing user             |
| AUTH-03 | `UserRepository`             | CRUD; responses never include `passwordHash`                   |
| AUTH-04 | `TokenService`               | Access JWT + refresh rotate/revoke                             |
| AUTH-05 | `JwtStrategy`                | Bearer extract; load user; unknown user → `TOKEN_INVALID`      |
| AUTH-06 | `JwtAuthGuard`               | Global; `@Public()` skip; `TOKEN_EXPIRED` / `TOKEN_INVALID`    |
| AUTH-07 | Decorators                   | `@Public()`, `@CurrentUser()`                                  |
| AUTH-08 | DTOs                         | Register, login, refresh, logout, OTP, forgot/reset, update-me |
| AUTH-09 | Refresh family reuse         | Reuse of a rotated refresh token revokes the family            |
| AUTH-10 | `POST /auth/guest`           | Returns token pair + guest user                                |
| AUTH-11 | Register + email OTP         | Unverified user + mail; verify issues tokens; resend cooldown  |
| AUTH-12 | `POST /auth/convert`         | Authenticated guest → registered; same `userId`                |
| AUTH-13 | `POST /auth/login`           | Constant-time miss; `EMAIL_NOT_VERIFIED` if unverified         |
| AUTH-14 | `POST /auth/refresh`         | Rotate pair; public (refresh token in body)                    |
| AUTH-15 | `POST /auth/logout`          | 204; revoke family + current access `jti`                      |
| AUTH-16 | `RegisteredUserGuard`        | Guests get **403** `GUEST_NOT_ALLOWED`                         |
| AUTH-17 | App wiring                   | Stub `app/auth.controller.ts` removed; `AuthModule` imported   |
| USER-01 | `GET /auth/me`               | `SafeUser` (no hash)                                           |
| USER-02 | `PATCH /auth/me` displayName | Registered only                                                |
| USER-03 | `PATCH /auth/me` InstaPay    | Stored lowercase; registered only                              |

## HTTP

Prefix: `/api/auth`. Tighter throttles on login, register, OTP, and forgot-password (see controller `@Throttle`).

| Method  | Path                          | Auth       | Notes                                             |
| ------- | ----------------------------- | ---------- | ------------------------------------------------- |
| `POST`  | `/guest`                      | public     | No body. **Not** device-id idempotent (see below) |
| `POST`  | `/register`                   | public     | `{ verificationRequired, email }`                 |
| `POST`  | `/register/verify-otp`        | public     | Token pair on success                             |
| `POST`  | `/register/resend-otp`        | public     | Generic success; `OTP_RESEND_COOLDOWN`            |
| `POST`  | `/convert`                    | guest JWT  | Same `userId`; memberships kept                   |
| `POST`  | `/login`                      | public     | `{ accessToken, refreshToken, user }`             |
| `POST`  | `/refresh`                    | public     | Body `{ refreshToken }`                           |
| `POST`  | `/logout`                     | JWT        | **204** empty body                                |
| `POST`  | `/forgot-password`            | public     | Enumeration-safe generic success                  |
| `POST`  | `/forgot-password/verify-otp` | public     | `{ resetToken }`                                  |
| `POST`  | `/reset-password`             | public     | Revokes all sessions                              |
| `GET`   | `/me`                         | JWT        | Profile                                           |
| `PATCH` | `/me`                         | registered | `displayName` and/or `instaPayHandle`             |

Token responses are **flat**: `{ accessToken, refreshToken, user }`. `user.kind` is `'guest' | 'registered'`. There is no `isGuest` field.

## AUTH-10 gap

`GuestDto` with `deviceId` exists, but `guest()` does not read a body. Each call mints a **new** guest. Mobile persists the refresh token so identity survives restarts via `/auth/refresh`. Do not treat guest as device-fingerprinted.

## Layout

```
apps/backend/src/auth/
  auth.module.ts
  auth.controller.ts
  auth.service.ts
  dto/
  guards/jwt-auth.guard.ts
  guards/registered-user.guard.ts
  strategies/jwt.strategy.ts
  decorators/public.decorator.ts
  decorators/current-user.decorator.ts
  services/token.service.ts
  services/password.service.ts
  services/otp.service.ts
  services/mail.service.ts
  services/user-repository.service.ts
```

A second `@Public()` lives in `src/shared/public.decorator.ts` (same metadata key). Prefer the auth decorator on HTTP routes.
