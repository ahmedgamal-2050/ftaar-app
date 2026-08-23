# AUTH System Implementation Plan

## Overview

Full JWT-based authentication system for the ftaar-app NestJS backend, covering guests (device-ID based), registered users (email/password), token refresh with rotation + family revocation, and profile management.

---

## Authentication Flow Diagrams

### Overview — Complete Auth System

```mermaid
graph LR
    CLIENT(("👤 Client"))

    %% ── Entry points ──────────────────────────────────────────
    CLIENT -->|"POST /auth/guest\n{ deviceId }"| GUEST_EP["Guest Login"]
    CLIENT -->|"POST /auth/register\n{ email, password }"| REG_EP["Register"]
    CLIENT -->|"POST /auth/login\n{ email, password }"| LOGIN_EP["Login"]

    %% ── User creation ──────────────────────────────────────────
    GUEST_EP -->|"find or create\nidempotent"| GUEST_USER[("Guest User\nkind='guest'")]
    REG_EP   -->|"bcrypt hash\ncost=12"| REG_USER[("Registered User\nkind='registered'")]
    LOGIN_EP -->|"constant-time\nbcrypt compare"| REG_USER

    %% ── Token issuance ──────────────────────────────────────────
    GUEST_USER -->|"issue"| AT(["Access Token\nJWT · 15 min"])
    GUEST_USER -->|"issue"| RT(["Refresh Token\nbcrypt-hashed · 30 days"])
    REG_USER   -->|"issue"| AT
    REG_USER   -->|"issue"| RT

    %% ── Token use ──────────────────────────────────────────────
    AT -->|"Bearer header"| PROTECTED{{"Protected\nEndpoints"}}

    PROTECTED -->|"GET /auth/me"| PROFILE["User Profile"]
    PROTECTED -->|"PATCH /auth/me\nregistered only"| UPDATE["Update Profile"]
    PROTECTED -->|"POST /auth/convert\nguest only"| CONVERT["Convert Account"]

    UPDATE -->|"kind='guest'"| BLOCKED(["403\nGUEST_NOT_ALLOWED"])
    CONVERT -->|"preserves userId\nmemberships intact"| REG_USER

    %% ── Refresh & logout ──────────────────────────────────────
    CLIENT -->|"POST /auth/refresh\n{ refreshToken }"| REFRESH["Rotate Token"]
    CLIENT -->|"POST /auth/logout\n{ refreshToken }"| LOGOUT["Revoke Family"]

    REFRESH -->|"valid → revoke old\nissue new"| RT
    REFRESH -->|"reuse detected"| REVOKED(["Family Revoked\nall tokens invalid"])
    LOGOUT  -->|"revoke all in family"| REVOKED

    %% ── Colours ──────────────────────────────────────────────
    classDef endpoint  fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
    classDef user      fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef token     fill:#f3e8ff,stroke:#9333ea,color:#581c87
    classDef danger    fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef action    fill:#fef9c3,stroke:#ca8a04,color:#713f12

    class GUEST_EP,REG_EP,LOGIN_EP endpoint
    class GUEST_USER,REG_USER user
    class AT,RT token
    class BLOCKED,REVOKED danger
    class PROFILE,UPDATE,CONVERT,REFRESH,LOGOUT,PROTECTED action
```

```mermaid
sequenceDiagram
    actor Client
    participant API as AuthController
    participant SVC as AuthService
    participant DB as Database

    Client->>API: POST /auth/guest { deviceId }
    API->>SVC: guest(dto)
    SVC->>DB: findFirst WHERE deviceId = ?
    alt User exists
        DB-->>SVC: existing User
    else New device
        SVC->>DB: create { kind: 'guest', deviceId }
        DB-->>SVC: new User
    end
    SVC->>SVC: issueAccessToken (JWT 15m)
    SVC->>DB: INSERT refresh_tokens (bcrypt hash, familyId UUID)
    DB-->>SVC: RefreshToken row
    SVC-->>API: { accessToken, refreshToken, user }
    API-->>Client: 200 { accessToken, refreshToken, user }
```

### 2. Register (AUTH-11)

```mermaid
sequenceDiagram
    actor Client
    participant API as AuthController
    participant SVC as AuthService
    participant DB as Database

    Client->>API: POST /auth/register { email, password }
    API->>SVC: register(dto)
    SVC->>DB: findFirst WHERE email ilike ?
    alt Email already taken
        DB-->>SVC: existing User
        SVC-->>API: AppError ALREADY_EXISTS
        API-->>Client: 409 Conflict
    else Email available
        DB-->>SVC: null
        SVC->>SVC: bcrypt.hash(password, cost=12)
        SVC->>DB: create { kind: 'registered', email, passwordHash }
        alt Concurrent duplicate (TOCTOU)
            DB-->>SVC: P2002 unique violation
            SVC-->>API: AppError ALREADY_EXISTS
            API-->>Client: 409 Conflict
        else
            DB-->>SVC: new User
            SVC->>SVC: issueAccessToken + issueRefreshToken
            SVC-->>API: { accessToken, refreshToken, user }
            API-->>Client: 201 Created
        end
    end
```

### 3. Login (AUTH-13)

```mermaid
sequenceDiagram
    actor Client
    participant API as AuthController
    participant SVC as AuthService
    participant DB as Database

    Client->>API: POST /auth/login { email, password }
    API->>SVC: login(dto)
    SVC->>DB: findFirst WHERE email ilike ?
    alt User not found
        DB-->>SVC: null
        SVC->>SVC: dummyCompare() — burns bcrypt rounds for timing parity
        SVC-->>API: AppError INVALID_CREDENTIALS
        API-->>Client: 401 Unauthorized
    else User found
        DB-->>SVC: User (with passwordHash)
        SVC->>SVC: bcrypt.compare(password, passwordHash)
        alt Wrong password
            SVC-->>API: AppError INVALID_CREDENTIALS
            API-->>Client: 401 Unauthorized
        else Correct password
            SVC->>SVC: issueAccessToken + issueRefreshToken
            SVC-->>API: { accessToken, refreshToken, user }
            API-->>Client: 200 OK
        end
    end
```

### 4. Convert Guest → Registered (AUTH-12)

```mermaid
sequenceDiagram
    actor Client
    participant API as AuthController
    participant SVC as AuthService
    participant DB as Database

    Client->>API: POST /auth/convert { email, password }\nAuthorization: Bearer <guest-JWT>
    Note over API: JwtAuthGuard validates JWT
    API->>SVC: convert(userId, kind='guest', dto)
    alt Caller is not a guest
        SVC-->>API: AppError FORBIDDEN
        API-->>Client: 403 Forbidden
    else Is a guest
        SVC->>DB: findFirst WHERE email ilike ?
        alt Email taken
            SVC-->>API: AppError ALREADY_EXISTS
            API-->>Client: 409 Conflict
        else
            SVC->>SVC: bcrypt.hash(password, cost=12)
            SVC->>DB: UPDATE users SET kind='registered', email, passwordHash,\ndeviceId=NULL WHERE id=userId
            DB-->>SVC: updated User (SAME userId — memberships preserved)
            SVC->>SVC: issueAccessToken + issueRefreshToken
            SVC-->>API: { accessToken, refreshToken, user }
            API-->>Client: 200 OK (same userId)
        end
    end
```

### 5. Token Refresh (AUTH-14)

```mermaid
sequenceDiagram
    actor Client
    participant API as AuthController
    participant SVC as AuthService
    participant DB as Database

    Client->>API: POST /auth/refresh { refreshToken: "familyId:raw" }
    API->>SVC: refresh(dto)
    SVC->>SVC: splitToken → familyId, raw
    SVC->>DB: findMany refresh_tokens WHERE familyId ORDER BY createdAt DESC
    alt No tokens found
        DB-->>SVC: []
        SVC-->>API: AppError TOKEN_INVALID
        API-->>Client: 401
    else Tokens found
        DB-->>SVC: [latest, ...]
        alt latest.revokedAt is set — REUSE ATTACK
            SVC->>DB: UPDATE all family tokens SET revokedAt = now
            SVC-->>API: AppError TOKEN_INVALID
            API-->>Client: 401 (whole family revoked)
        else latest.expiresAt < now
            SVC-->>API: AppError TOKEN_EXPIRED
            API-->>Client: 401
        else
            SVC->>SVC: bcrypt.compare(raw, latest.tokenHash)
            alt Invalid hash
                SVC-->>API: AppError TOKEN_INVALID
                API-->>Client: 401
            else Valid
                SVC->>DB: UPDATE latest SET revokedAt = now
                SVC->>DB: INSERT new refresh_token (same familyId)
                SVC->>SVC: issueAccessToken (new JWT 15m)
                SVC-->>API: { accessToken, refreshToken (new) }
                API-->>Client: 200 OK
            end
        end
    end
```

### 6. Logout (AUTH-15)

```mermaid
sequenceDiagram
    actor Client
    participant API as AuthController
    participant SVC as AuthService
    participant DB as Database

    Client->>API: POST /auth/logout { refreshToken: "familyId:raw" }
    API->>SVC: logout(dto)
    SVC->>SVC: splitToken → familyId
    SVC->>DB: UPDATE refresh_tokens SET revokedAt = now\nWHERE familyId = ? AND revokedAt IS NULL
    DB-->>SVC: ok
    SVC-->>API: void
    API-->>Client: 204 No Content
```

### 7. JWT Guard Flow (every protected request)

```mermaid
flowchart TD
    REQ([Incoming Request]) --> GUARD{JwtAuthGuard}
    GUARD -->|@Public() on handler/class| PASS([Allow — skip JWT check])
    GUARD -->|No @Public()| PASSPORT[Passport extracts Bearer token]
    PASSPORT -->|Missing token| ERR1[AppError UNAUTHORIZED 401]
    PASSPORT -->|Token present| VERIFY{Verify signature\n& expiry}
    VERIFY -->|TokenExpiredError| ERR2[AppError TOKEN_EXPIRED 401]
    VERIFY -->|JsonWebTokenError| ERR3[AppError TOKEN_INVALID 401]
    VERIFY -->|Valid| VALIDATE[JwtStrategy.validate\nlookup user in DB]
    VALIDATE -->|User not found| ERR4[AppError TOKEN_INVALID 401]
    VALIDATE -->|Found| ATTACH[Attach user to req.user]
    ATTACH --> HANDLER([Route handler executes])
```

---

## Tasks Covered

### AUTH Tasks

| Task    | Description                                                              |
| ------- | ------------------------------------------------------------------------ |
| AUTH-01 | Prisma `RefreshToken` model + migration                                  |
| AUTH-02 | `PasswordService` — bcrypt hash/compare                                  |
| AUTH-03 | `UserRepository` — CRUD helpers, never expose `passwordHash`             |
| AUTH-04 | `TokenService` — issue/rotate/revoke JWT + refresh tokens                |
| AUTH-05 | `JwtStrategy` — Passport JWT Bearer extraction                           |
| AUTH-06 | `JwtAuthGuard` — global guard with `@Public()` bypass                    |
| AUTH-07 | `@Public()` / `@CurrentUser()` decorators                                |
| AUTH-08 | DTOs — GuestDto, RegisterDto, RefreshDto, LogoutDto, UpdateMeDto         |
| AUTH-09 | Refresh token family revocation on reuse (security event)                |
| AUTH-10 | `POST /auth/guest` — idempotent device-ID → userId                       |
| AUTH-11 | `POST /auth/register` — create registered user                           |
| AUTH-12 | `POST /auth/convert` — upgrade guest → registered (same userId)          |
| AUTH-13 | `POST /auth/login` — constant-time compare even on missing user          |
| AUTH-14 | `POST /auth/refresh` — rotate refresh token                              |
| AUTH-15 | `POST /auth/logout` — revoke refresh token family                        |
| AUTH-16 | `RegisteredUserGuard` — 403 for guests on registered-only routes         |
| AUTH-17 | `AppModule` wiring — global `JwtAuthGuard`, remove stub `AuthController` |

### USER Tasks

| Task    | Description                                                         |
| ------- | ------------------------------------------------------------------- |
| USER-01 | `GET /auth/me` — return profile, never `passwordHash`               |
| USER-02 | `PATCH /auth/me` — update `displayName`                             |
| USER-03 | `PATCH /auth/me` — update/clear `instaPayHandle` (stored lowercase) |

---

## Architecture

```
apps/backend/src/
├── auth/
│   ├── auth.module.ts          # JwtModule, PassportModule, all providers
│   ├── auth.service.ts         # Business logic for all auth endpoints
│   ├── auth.controller.ts      # Route handlers
│   ├── decorators/
│   │   ├── public.decorator.ts       # @Public() — skips JwtAuthGuard
│   │   └── current-user.decorator.ts # @CurrentUser() param decorator
│   ├── dto/
│   │   ├── guest.dto.ts         # { deviceId: string }
│   │   ├── register.dto.ts      # { email, password }
│   │   ├── refresh.dto.ts       # { refreshToken: string }
│   │   ├── logout.dto.ts        # { refreshToken: string }
│   │   └── update-me.dto.ts     # { displayName?, instaPayHandle? }
│   ├── guards/
│   │   ├── jwt-auth.guard.ts         # Extends AuthGuard('jwt'), checks IS_PUBLIC
│   │   └── registered-user.guard.ts  # Blocks guests with GUEST_NOT_ALLOWED
│   ├── services/
│   │   ├── password.service.ts       # bcrypt hash (cost 12) + compare
│   │   ├── token.service.ts          # JWT + refresh token lifecycle
│   │   └── user-repository.service.ts# DB CRUD — never returns passwordHash
│   └── strategies/
│       └── jwt.strategy.ts           # Passport JWT strategy
├── core/
│   ├── config/
│   │   ├── env.schema.ts       # + JWT_SECRET validation
│   │   └── app-config.service.ts # + jwtSecret getter
│   └── errors/
│       └── error-codes.ts      # + GUEST_NOT_ALLOWED → 403
└── prisma/
    └── schema.prisma           # + instaPayHandle on User, RefreshToken model
```

---

## Database Changes

### User model additions

- `instaPayHandle String? @map("insta_pay_handle") @db.VarChar(100)`

### New RefreshToken model

```prisma
model RefreshToken {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  user      User      @relation(...)
  tokenHash String    @map("token_hash") @db.VarChar(255)
  familyId  String    @map("family_id") @db.Uuid
  expiresAt DateTime  @map("expires_at") @db.Timestamptz(6)
  revokedAt DateTime? @map("revoked_at") @db.Timestamptz(6)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  // indexes: userId, familyId
}
```

---

## Security Decisions

| Decision                              | Rationale                                                          |
| ------------------------------------- | ------------------------------------------------------------------ |
| bcrypt cost 12                        | ~250ms on modern hardware — balances UX and brute-force resistance |
| Access token 15 min                   | Short-lived; compromise window is small                            |
| Refresh token 30 days, rotated on use | Long sessions without persistent login risk                        |
| Family revocation on reuse            | Detects refresh token theft — entire token chain is revoked        |
| Constant-time login                   | Same error + dummy compare when user not found (AUTH-13)           |
| `passwordHash` never returned         | Defensive: stripped at repository layer                            |
| `@Public()` metadata guard            | Opt-in public routes vs opt-out; secure by default                 |

---

## Environment Variables Required

| Variable       | Rule                   |
| -------------- | ---------------------- |
| `DATABASE_URL` | `postgresql://` URL    |
| `JWT_SECRET`   | Min 32 chars, required |

---

## Endpoints

| Method | Path           | Auth        | Description                           |
| ------ | -------------- | ----------- | ------------------------------------- |
| POST   | /auth/guest    | Public      | Get/create guest user by deviceId     |
| POST   | /auth/register | Public      | Create registered user                |
| POST   | /auth/convert  | JWT (guest) | Upgrade guest to registered           |
| POST   | /auth/login    | Public      | Email/password login                  |
| POST   | /auth/refresh  | Public      | Rotate refresh token                  |
| POST   | /auth/logout   | Public      | Revoke refresh token family           |
| GET    | /auth/me       | JWT         | Get current user profile              |
| PATCH  | /auth/me       | JWT         | Update display name / instaPay handle |

---

## Implementation Status

- [x] Install packages (`@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`)
- [x] Update `prisma/schema.prisma`
- [x] Update `error-codes.ts` — add `GUEST_NOT_ALLOWED`
- [x] Update `env.schema.ts` — add `JWT_SECRET`
- [x] Update `app-config.service.ts` — add `jwtSecret` getter
- [x] `auth/decorators/public.decorator.ts`
- [x] `auth/decorators/current-user.decorator.ts`
- [x] `auth/dto/*.ts`
- [x] `auth/guards/jwt-auth.guard.ts`
- [x] `auth/guards/registered-user.guard.ts`
- [x] `auth/strategies/jwt.strategy.ts`
- [x] `auth/services/password.service.ts`
- [x] `auth/services/user-repository.service.ts`
- [x] `auth/services/token.service.ts`
- [x] `auth/auth.service.ts`
- [x] `auth/auth.controller.ts`
- [x] `auth/auth.module.ts`
- [x] Update `app/app.module.ts` — wire `AuthModule`, global `JwtAuthGuard`, remove stub
- [x] Delete `app/auth.controller.ts`
- [ ] Run `prisma migrate dev`
