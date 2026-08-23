# Authentication / OTP Security Audit Report

> Audited: 2026-08-23  
> Branch: `master`  
> Scope: NestJS backend — all OTP, auth, rate-limiting, and password-reset flows

---

## Table of Contents

1. [OTP Format](#1-otp-format)
2. [OTP Expiration](#2-otp-expiration)
3. [Invalid OTP Attempts](#3-invalid-otp-attempts)
4. [Blocking Behavior](#4-blocking-behavior)
5. [Delay Between OTP Verification Attempts](#5-delay-between-otp-verification-attempts)
6. [OTP Resend Cooldown](#6-otp-resend-cooldown)
7. [What Happens to the Previous OTP After Resend](#7-what-happens-to-the-previous-otp-after-resend)
8. [Rate Limiting](#8-rate-limiting)
9. [OTP Attempts vs. HTTP Rate Limiting vs. Resend Cooldown](#9-otp-attempts-vs-http-rate-limiting-vs-resend-cooldown)
10. [OTP Purpose Isolation](#10-otp-purpose-isolation)
11. [OTP Consumption / Reuse](#11-otp-consumption--reuse)
12. [OTP Hashing / Security](#12-otp-hashing--security)
13. [Registration Behavior](#13-registration-behavior)
14. [Forgot-Password Behavior](#14-forgot-password-behavior)
15. [Password Reset Token](#15-password-reset-token)
16. [After Password Reset](#16-after-password-reset)
17. [Error Codes](#17-error-codes)
18. [Environment Variables](#18-environment-variables)
19. [Mail Sending Protections](#19-mail-sending-protections)
20. [Test Coverage](#20-test-coverage)
21. [Final Summary](#21-final-summary)
22. [Missing Protections](#22-missing-protections)
23. [Potential Problems](#23-potential-problems)
24. [Recommended Policy](#24-recommended-policy)

---

## 1. OTP Format

| Property             | Value                                                                   |
| -------------------- | ----------------------------------------------------------------------- |
| Length               | 6 digits                                                                |
| Format               | Numeric only (`\d{6}`)                                                  |
| Generator            | `randomInt(100_000, 1_000_000)` from `node:crypto`                      |
| Leading zeros        | **Impossible** — minimum value is 100,000                               |
| `Math.random()` used | **No** — never appears anywhere                                         |
| Stored as            | HMAC-SHA256 hex digest (64 hex chars), with a server-side secret pepper |
| Raw OTP stored       | **Never** — only the hash is persisted                                  |

**Code location:** `apps/backend/src/auth/services/otp.service.ts` — `randomInt(100_000, 1_000_000)`, result converted to string via `String(...)`.

---

## 2. OTP Expiration

### EMAIL_VERIFICATION

- **TTL:** `EMAIL_VERIFICATION_OTP_TTL_MINUTES` — default **10 minutes**
- **Source:** Joi-validated env var → `AppConfigService.emailVerificationOtpTtlMinutes`
- **On expiry:** `validate()` checks `record.expiresAt < new Date()` → throws `OTP_EXPIRED` (HTTP 422)
- **DB cleanup:** Expired records are **NOT deleted**. They remain in the `otp_verifications` table with `consumedAt = null` and `expiresAt` in the past. No background cleanup job exists.

### PASSWORD_RESET

- **TTL:** `PASSWORD_RESET_OTP_TTL_MINUTES` — default **10 minutes**
- Same behavior as `EMAIL_VERIFICATION` for expiry and DB retention.

---

## 3. Invalid OTP Attempts

### Applies to both EMAIL_VERIFICATION and PASSWORD_RESET

**Max wrong attempts:** `5` (default via `EMAIL_VERIFICATION_OTP_MAX_ATTEMPTS` / `PASSWORD_RESET_OTP_MAX_ATTEMPTS`)

**Attempt counter behavior in `validate()`:**

```
Pre-check:  if (record.attempts >= maxAttempts) → OTP_TOO_MANY_ATTEMPTS (no increment)
Then:       increment attempts in DB unconditionally before comparing
Then:       compare hash
If wrong:   if (updated.attempts >= maxAttempts) → OTP_TOO_MANY_ATTEMPTS
            else → INVALID_OTP
```

**Walk-through with maxAttempts = 5:**

| Attempt | DB `attempts` at read | After increment   | Wrong OTP response                           |
| ------- | --------------------- | ----------------- | -------------------------------------------- |
| 1       | 0                     | 1                 | `INVALID_OTP`                                |
| 2       | 1                     | 2                 | `INVALID_OTP`                                |
| 3       | 2                     | 3                 | `INVALID_OTP`                                |
| 4       | 3                     | 4                 | `INVALID_OTP`                                |
| **5**   | 4                     | 5                 | `OTP_TOO_MANY_ATTEMPTS` **← OTP now locked** |
| 6+      | 5                     | (not incremented) | `OTP_TOO_MANY_ATTEMPTS`                      |

- **Attempts stored in DB:** Yes — `attempts` column on `OtpVerification`
- **Correct OTP resets attempts:** No — the OTP is consumed, not reset
- **After max attempts:** The OTP record is permanently blocked. User must request a new OTP via resend
- **Attempts increment on successful OTP:** Yes — attempts are incremented before hash comparison; has no adverse effect since the record is immediately consumed in the transaction afterward

---

## 4. Blocking Behavior

> **Temporary OTP verification block: NOT IMPLEMENTED**

Reaching the maximum attempt count (5) simply makes the specific OTP record permanently unavailable. There is no time-limited lockout. There is no `blockedUntil` or `lockedUntil` field anywhere in the schema or code.

The user must request a new OTP. The resend cooldown (60 sec) then applies before a new code can be sent.

There is no per-IP, per-email, or per-user verification block — only HTTP-level rate limiting (see [section 8](#8-rate-limiting)).

---

## 5. Delay Between OTP Verification Attempts

> **Cooldown between OTP verification attempts: NONE**

Within the 5-attempt limit, a client can submit OTPs as fast as the HTTP rate limit allows (10 requests per 60-second window per IP). There is no mandatory per-attempt delay enforced at the application level.

---

## 6. OTP Resend Cooldown

### Register resend OTP — `POST /auth/register/resend-otp`

| Property             | Value                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Env var              | `EMAIL_VERIFICATION_OTP_RESEND_COOLDOWN_SECONDS`                                                                                                                                        |
| Default              | **60 seconds**                                                                                                                                                                          |
| Calculation          | `isWithinResendCooldown()` queries for an **unconsumed** OTP for the same `userId + purpose` created within the last N seconds. Returns a boolean only — remaining time is not exposed. |
| Response if too soon | `OTP_RESEND_COOLDOWN` — HTTP **429**                                                                                                                                                    |

### Forgot-password resend — `POST /auth/forgot-password`

| Property             | Value                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Env var              | `PASSWORD_RESET_OTP_RESEND_COOLDOWN_SECONDS`                                                                                                                                                |
| Default              | **60 seconds**                                                                                                                                                                              |
| Calculation          | Same `isWithinResendCooldown()` check                                                                                                                                                       |
| Response if too soon | **Same generic HTTP 200** — the cooldown is silently swallowed. The caller cannot distinguish "email not found", "in cooldown", or "OTP sent". Intentional, to prevent account enumeration. |

---

## 7. What Happens to the Previous OTP After Resend?

### Email verification (register + resend)

The private helper `issueVerificationOtp()` always calls `otp.invalidateActive()` first:

```sql
UPDATE otp_verifications
SET consumed_at = NOW()
WHERE user_id = ?
  AND purpose = 'email_verification'
  AND consumed_at IS NULL
```

Then a fresh record is created. **Only one active (unconsumed, unexpired) OTP per `userId + purpose` exists at any time.**

### Forgot-password

`forgotPassword()` explicitly calls `otp.invalidateActive(userId, PASSWORD_RESET)` before calling `otp.generate()`. Same single-active guarantee.

### DB state after resend

| OTP          | `consumed_at`            |
| ------------ | ------------------------ |
| OTP #1 (old) | Set to current timestamp |
| OTP #2 (new) | `NULL` — active          |

One active OTP per `user + purpose` is enforced at the application layer.

---

## 8. Rate Limiting

**Global default** (all non-health routes, via `ThrottlerModule.forRoot`): **100 requests / 60 seconds / IP**

| Endpoint                                | Limit        | Window | Key | On exceeded        |
| --------------------------------------- | ------------ | ------ | --- | ------------------ |
| `POST /auth/guest`                      | 100 (global) | 60 s   | IP  | 429 `RATE_LIMITED` |
| `POST /auth/register`                   | **5**        | 60 s   | IP  | 429 `RATE_LIMITED` |
| `POST /auth/register/verify-otp`        | **10**       | 60 s   | IP  | 429 `RATE_LIMITED` |
| `POST /auth/register/resend-otp`        | **5**        | 60 s   | IP  | 429 `RATE_LIMITED` |
| `POST /auth/login`                      | **10**       | 60 s   | IP  | 429 `RATE_LIMITED` |
| `POST /auth/refresh`                    | 100 (global) | 60 s   | IP  | 429 `RATE_LIMITED` |
| `POST /auth/logout`                     | 100 (global) | 60 s   | IP  | 429 `RATE_LIMITED` |
| `POST /auth/forgot-password`            | **5**        | 60 s   | IP  | 429 `RATE_LIMITED` |
| `POST /auth/forgot-password/verify-otp` | **10**       | 60 s   | IP  | 429 `RATE_LIMITED` |
| `POST /auth/reset-password`             | **5**        | 60 s   | IP  | 429 `RATE_LIMITED` |
| `GET /health`                           | **Exempt**   | —      | —   | —                  |

Key is IP address — default `ThrottlerGuard`, no custom tracker configured.  
`ThrottlerException` is mapped to `{ code: "RATE_LIMITED", ... }` by `AllExceptionsFilter`.

---

## 9. OTP Attempts vs. HTTP Rate Limiting vs. Resend Cooldown

These are three separate, independent mechanisms:

**OTP attempt limit**

- Controlled by `EMAIL_VERIFICATION_OTP_MAX_ATTEMPTS` / `PASSWORD_RESET_OTP_MAX_ATTEMPTS` (default 5)
- Stored per-OTP-record in the DB (`attempts` column)
- Tracks how many wrong codes were submitted for **one specific OTP record**
- Enforced in `OtpService.validate()`

**HTTP rate limit**

- Controlled by `@Throttle()` decorators + `ThrottlerModule` global default
- Stored in process memory (default NestJS in-memory storage)
- Tracks how many HTTP requests hit an endpoint within a rolling time window, keyed by **IP address**
- Enforced by `ThrottlerGuard` (registered as global `APP_GUARD`)

**Resend cooldown**

- Controlled by `EMAIL_VERIFICATION_OTP_RESEND_COOLDOWN_SECONDS` / `PASSWORD_RESET_OTP_RESEND_COOLDOWN_SECONDS` (default 60 sec)
- Stored in the DB — `isWithinResendCooldown()` queries the `otp_verifications` table
- Tracks time since the last OTP was issued for a **specific user + purpose**
- Enforced in `AuthService.resendRegistrationOtp()` and `AuthService.forgotPassword()`

All three can trigger simultaneously. A request can be blocked by any one of them independently.

---

## 10. OTP Purpose Isolation

Two purposes are defined as a Prisma enum mapped to a PostgreSQL enum:

```
OtpPurpose.EMAIL_VERIFICATION → "email_verification"
OtpPurpose.PASSWORD_RESET     → "password_reset"
```

`OtpService.validate()` always includes `purpose` in the DB query:

```typescript
db.otpVerification.findFirst({
  where: { userId, purpose, consumedAt: null },
  ...
})
```

- `verifyRegistrationOtp()` calls `validate(userId, OtpPurpose.EMAIL_VERIFICATION, ...)` — only an `email_verification` record can satisfy this
- `verifyForgotPasswordOtp()` calls `validate(userId, OtpPurpose.PASSWORD_RESET, ...)` — only a `password_reset` record can satisfy this

**A registration OTP cannot reset a password. A password-reset OTP cannot verify an email.**  
Purpose isolation is enforced at the DB query level, not just application logic.  
Confirmed by test: `otp.service.spec.ts` — "EMAIL_VERIFICATION OTP is not accepted for PASSWORD_RESET".

---

## 11. OTP Consumption / Reuse

- `OtpVerification.consumedAt` field (`DateTime?`, default `null`)
- `validate()` filters `consumedAt: null` — consumed OTPs are invisible to the validator
- `consume()` sets `consumedAt = new Date()` via Prisma `update`

**Atomicity:** Consumption is always performed inside a `$transaction` alongside other state changes:

- **Email verification:** `otp.consume(otpId, tx)` + `user.update({ emailVerifiedAt })` in one transaction
- **Password reset OTP:** `otp.consume(otpId, tx)` + `tokens.issuePasswordResetToken()` in one transaction

**Race condition (TOCTOU gap):** `validate()` runs outside the transaction. Two simultaneous requests with the same correct OTP could both pass `validate()` and both receive the `otpId`. They would then both enter the transaction, with the second `consume()` call being an idempotent no-op update. However, **both requests would succeed** — both would get `emailVerifiedAt` set and receive tokens, or both would receive a reset token. The `validate + consume` sequence is not a single atomic operation.

---

## 12. OTP Hashing / Security

| Property                | Value                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Algorithm               | HMAC-SHA256                                                                                                                                                                     |
| Pepper/secret           | `EMAIL_OTP_SECRET` env var (min 32 chars, **required**)                                                                                                                         |
| Output stored           | 64 hex chars in `otp_verifications.otp_hash` (VARCHAR 64)                                                                                                                       |
| Raw OTP in DB           | **Never**                                                                                                                                                                       |
| Comparison method       | `timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))` — constant-time                                                                                                 |
| Raw OTP in logs         | **Not found** — no `console.log(otp)` or `logger.debug(otp)` in any source file                                                                                                 |
| Raw OTP in API response | **Never** — only `{ verificationRequired: true, email }` returned at registration                                                                                               |
| Raw OTP in dev output   | **Yes** — `MailService.send()` catches SMTP errors in non-production and prints the full email body (including the raw OTP) to `process.stdout`. Intentional dev-only fallback. |

---

## 13. Registration Behavior

`POST /auth/register`:

- Returns `{ verificationRequired: true, email }` — **no `accessToken`, no `refreshToken`**
- User stored with `emailVerifiedAt = null`, `kind = 'registered'`
- Password stored as bcrypt hash (cost factor 12)
- OTP generated and emailed; tokens withheld until email is verified

**Can an unverified user log in?**  
**No.** `login()` checks `if (user.kind === 'registered' && user.emailVerifiedAt === null)` → throws `EMAIL_NOT_VERIFIED` (HTTP **403**).

**Is the `EMAIL_NOT_VERIFIED` guard timing-safe?**  
Yes. The login path calls `passwords.compare()` before checking `emailVerifiedAt`, so timing behavior is consistent.

**Idempotent registration:** If an unverified user calls `POST /auth/register` again with the same email, the existing account is reused and a fresh OTP is sent. No duplicate user is created. A fully verified existing email throws `EMAIL_ALREADY_REGISTERED` (409).

---

## 14. Forgot-Password Behavior

`POST /auth/forgot-password` always returns the same generic message:

> "If an account exists for this email, a password reset code has been sent."

This same response is returned for:

- Unknown email
- Guest account (no email)
- Unverified registered user
- Verified user within cooldown window
- Verified user who successfully receives an OTP

**Account enumeration: prevented** — the caller cannot distinguish any of these cases.

**OTP generated only for:** verified, registered users (`kind === 'registered'` AND `emailVerifiedAt !== null`).  
**Purpose used:** `OtpPurpose.PASSWORD_RESET` — isolated from email verification.  
**Cooldown:** silently enforced (same generic 200 response), unlike registration resend which throws `OTP_RESEND_COOLDOWN` (429).

---

## 15. Password Reset Token

| Property                    | Value                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| Type                        | Opaque, format: `tokenId:randomHex` (`randomBytes(32).toString('hex')`)                                |
| TTL                         | `PASSWORD_RESET_TOKEN_TTL_MINUTES` — default **10 minutes**                                            |
| Stored as                   | bcrypt hash (cost 12) in `password_reset_tokens.token_hash`                                            |
| One-time use                | **Yes** — `consumedAt` field checked before use                                                        |
| Reuse prevention            | `if (record.consumedAt !== null) → INVALID_RESET_TOKEN`                                                |
| Use as normal access token  | **Not possible** — completely separate code path, not a JWT, not validated by `JwtAuthGuard`           |
| Scope/purpose               | `validatePasswordResetToken()` only returns `{ userId, tokenId }` — no roles, no scopes                |
| Error for all failure cases | `INVALID_RESET_TOKEN` (HTTP 422) — same error for expired, consumed, or invalid token (no enumeration) |

Validation checks in order: record exists → `consumedAt === null` → `expiresAt > now` → bcrypt compare.

---

## 16. After Password Reset

All of the following happen in **one `$transaction`**:

1. `user.update({ passwordHash })` — password updated to new bcrypt hash
2. `passwordResetToken.update({ consumedAt: new Date() })` — reset token consumed (cannot be reused)
3. `otpVerification.updateMany({ consumedAt: new Date() })` where `purpose = PASSWORD_RESET AND consumedAt IS NULL` — any remaining password-reset OTPs invalidated
4. `refreshToken.updateMany({ revokedAt: new Date() })` where `revokedAt IS NULL` — **ALL active refresh token families revoked**

After this transaction:

- Old password rejected (new hash stored)
- All refresh tokens invalid — user must re-authenticate on all devices
- Any in-flight password-reset OTPs consumed
- **Access tokens already issued remain valid** until their natural 15-minute expiry
- The `$transaction` is atomic — all four operations succeed or all roll back

---

## 17. Error Codes

| Code                       | HTTP | When                                                                       |
| -------------------------- | ---- | -------------------------------------------------------------------------- |
| `EMAIL_ALREADY_REGISTERED` | 409  | `POST /auth/register` — a verified account with that email already exists  |
| `EMAIL_NOT_VERIFIED`       | 403  | `POST /auth/login` — registered user whose `emailVerifiedAt` is `null`     |
| `INVALID_CREDENTIALS`      | 401  | `POST /auth/login` — user not found, no password hash, or wrong password   |
| `INVALID_OTP`              | 422  | No active OTP found, or wrong code submitted (and attempts < max)          |
| `OTP_EXPIRED`              | 422  | Active OTP record exists but `expiresAt < now`                             |
| `OTP_TOO_MANY_ATTEMPTS`    | 422  | `attempts >= maxAttempts` (5 by default)                                   |
| `OTP_RESEND_COOLDOWN`      | 429  | `POST /auth/register/resend-otp` called within cooldown window             |
| `INVALID_RESET_TOKEN`      | 422  | Reset token not found, already consumed, expired, or hash mismatch         |
| `RATE_LIMITED`             | 429  | ThrottlerGuard limit exceeded on any endpoint                              |
| `TOKEN_EXPIRED`            | 401  | JWT `exp` claim is in the past                                             |
| `TOKEN_INVALID`            | 401  | JWT signature invalid, JTI in `revoked_tokens`, or user deleted            |
| `NOT_FOUND`                | 404  | `POST /auth/register/verify-otp` — no unverified user found for that email |
| `FORBIDDEN`                | 403  | Generic forbidden (e.g., guest tries to access registered-only route)      |
| `GUEST_NOT_ALLOWED`        | 403  | `RegisteredUserGuard` — guest accesses a registered-only endpoint          |
| `UNAUTHORIZED`             | 401  | Missing or unparseable bearer token                                        |
| `VALIDATION_ERROR`         | 400  | DTO validation failed (`class-validator`)                                  |

---

## 18. Environment Variables

| Variable                                         | Default             | Required                   | Purpose                                            |
| ------------------------------------------------ | ------------------- | -------------------------- | -------------------------------------------------- |
| `JWT_SECRET`                                     | _(no default)_      | **Required**, min 32 chars | Signs access token JWTs                            |
| `EMAIL_OTP_SECRET`                               | _(no default)_      | **Required**, min 32 chars | HMAC-SHA256 pepper for OTP hashing                 |
| `EMAIL_VERIFICATION_OTP_TTL_MINUTES`             | `10`                | Optional                   | How long registration OTPs are valid               |
| `EMAIL_VERIFICATION_OTP_MAX_ATTEMPTS`            | `5`                 | Optional                   | Wrong attempts before registration OTP is locked   |
| `EMAIL_VERIFICATION_OTP_RESEND_COOLDOWN_SECONDS` | `60`                | Optional                   | Min time between registration OTP resends          |
| `PASSWORD_RESET_OTP_TTL_MINUTES`                 | `10`                | Optional                   | How long password-reset OTPs are valid             |
| `PASSWORD_RESET_OTP_MAX_ATTEMPTS`                | `5`                 | Optional                   | Wrong attempts before password-reset OTP is locked |
| `PASSWORD_RESET_OTP_RESEND_COOLDOWN_SECONDS`     | `60`                | Optional                   | Min time between forgot-password requests          |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES`               | `10`                | Optional                   | How long the opaque reset token is valid           |
| `SMTP_HOST`                                      | `localhost`         | Optional                   | Mail server host                                   |
| `SMTP_PORT`                                      | `587`               | Optional                   | Mail server port (465 activates TLS)               |
| `SMTP_USER`                                      | `""`                | Optional                   | SMTP auth username                                 |
| `SMTP_PASS`                                      | `""`                | Optional                   | SMTP auth password                                 |
| `MAIL_FROM`                                      | `noreply@ftaar.app` | Optional                   | From address on all emails                         |

All optional vars use Joi `.default()` — defaults are applied at startup by `parseEnv()` regardless of whether the env var is set.

---

## 19. Mail Sending Protections

**What prevents OTP email spam:**

1. **Resend cooldown (per user, DB-backed):** 60 seconds between OTPs for the same `userId + purpose`. Enforced at the application layer.
2. **HTTP rate limit (per IP):** 5 requests per 60 seconds on `POST /auth/register` and `POST /auth/forgot-password`.

**Daily/hourly cap: NOT IMPLEMENTED.** There is no per-account, per-IP, or global cap on OTP emails beyond the 60-second cooldown. An attacker with many IPs could trigger a large number of OTP emails at a rate of ~1 email/minute/victim.

**Note on forgot-password:** The resend cooldown is silently swallowed (generic 200 response). An unauthenticated attacker calling `POST /auth/forgot-password` 5 times per 60 seconds against the same email would successfully trigger 1 email every ~60 seconds (after the first, the cooldown blocks further sends and returns the same generic 200).

---

## 20. Test Coverage

| Behavior                               | Status               | Location                                                                                                                               |
| -------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| OTP expiration                         | ✅ Covered           | `otp.service.spec.ts` — throws `OTP_EXPIRED`                                                                                           |
| Wrong attempts (`INVALID_OTP`)         | ✅ Covered           | `otp.service.spec.ts` — wrong OTP throws `INVALID_OTP`                                                                                 |
| Max attempts (`OTP_TOO_MANY_ATTEMPTS`) | ✅ Covered           | `otp.service.spec.ts` — `attempts >= 5` throws `OTP_TOO_MANY_ATTEMPTS`                                                                 |
| Resend cooldown                        | ✅ Covered           | `auth.service.spec.ts` — `isWithinResendCooldown = true` → `OTP_RESEND_COOLDOWN`                                                       |
| Rate limiting                          | ❌ Not covered       | No unit or integration test exercises HTTP throttling                                                                                  |
| OTP purpose separation                 | ✅ Covered           | `otp.service.spec.ts` — `PASSWORD_RESET` query does not match `EMAIL_VERIFICATION` OTP                                                 |
| OTP reuse prevention                   | ⚠️ Partially covered | `consume()` called in transaction tests, but the concurrent-request race condition is not tested                                       |
| OTP hashing (raw not stored)           | ✅ Covered           | `otp.service.spec.ts` — stored hash ≠ raw, matches `/^[0-9a-f]{64}$/`                                                                  |
| Forgot-password enumeration prevention | ✅ Covered           | `auth.service.spec.ts` — unknown email returns same message, no OTP generated                                                          |
| Reset token expiration                 | ⚠️ Partially covered | `INVALID_RESET_TOKEN` propagation tested; no test directly verifies the TTL/expiry path in `TokenService.validatePasswordResetToken()` |
| Reset token reuse                      | ✅ Covered           | `auth.service.spec.ts` — `validatePasswordResetToken` rejection propagates `INVALID_RESET_TOKEN`                                       |
| Refresh-session revocation after reset | ✅ Covered           | `auth.service.spec.ts` — `refreshToken.updateMany` with `revokedAt: null` called inside transaction                                    |

---

## 21. Final Summary

| Rule                               | Email Verification                               | Password Reset                                      |
| ---------------------------------- | ------------------------------------------------ | --------------------------------------------------- |
| OTP length                         | 6 digits                                         | 6 digits                                            |
| OTP TTL                            | 10 min (configurable)                            | 10 min (configurable)                               |
| Max wrong attempts                 | 5                                                | 5                                                   |
| Temporary time-based block         | **NOT IMPLEMENTED**                              | **NOT IMPLEMENTED**                                 |
| Attempt cooldown                   | **NONE**                                         | **NONE**                                            |
| Resend cooldown                    | 60 sec → HTTP 429                                | 60 sec → silent 200                                 |
| Endpoint rate limit                | Register: 5/60s · Verify: 10/60s · Resend: 5/60s | ForgotPwd: 5/60s · VerifyOTP: 10/60s · Reset: 5/60s |
| Previous OTP invalidated on resend | ✅ Yes (`consumedAt` set)                        | ✅ Yes (`consumedAt` set)                           |
| Single-use OTP                     | ✅ Yes (`consumedAt`)                            | ✅ Yes (`consumedAt`)                               |
| OTP hashed                         | ✅ HMAC-SHA256 + secret pepper                   | ✅ HMAC-SHA256 + secret pepper                      |
| Reset token TTL                    | N/A                                              | 10 min (configurable)                               |

---

## 22. Missing Protections

1. **No temporary lockout after max OTP attempts.** After 5 wrong OTPs the record is blocked but the user is not locked out for any period. Coupled with the 60-second resend cooldown, a persistent attacker can try 5 codes → wait 60 seconds → get a fresh OTP → try 5 more — indefinitely.

2. **No cooldown between individual verification attempts.** 10 requests per 60 seconds allows burst-guessing all 5 attempts in under a second.

3. **No longer-term mail sending cap.** No hourly or daily limit on OTP emails per account or per IP. An attacker can spam a victim's inbox at ~1 email/minute indefinitely.

4. **No throttler persistence.** The default NestJS throttler stores counters in process memory. A server restart resets all rate-limit counters.

5. **Stale OTP/expired records never cleaned up.** The `otp_verifications` table accumulates rows with no cleanup mechanism.

6. **No per-account lockout on login.** `POST /auth/login` has a 10/60s IP rate limit but no account-level login-attempt lockout. An attacker who rotates IPs faces no account-level braking.

7. **Access tokens outlive password reset.** After `resetPassword()`, all refresh tokens are revoked but previously issued access tokens (15-minute TTL) remain valid until natural expiry. There is no way to force-invalidate them without adding their JTIs to `revoked_tokens`.

---

## 23. Potential Problems

1. **TOCTOU race condition in OTP consumption.** `validate()` (which checks and increments attempts) runs outside the transaction. `consume()` runs inside a later transaction. Two near-simultaneous correct OTP submissions can both pass `validate()` and both get tokens/reset-tokens issued. This violates the single-use guarantee under concurrent load.

2. **Inconsistent resend cooldown behavior.** Registration resend throws HTTP 429 (`OTP_RESEND_COOLDOWN`) when within cooldown, while forgot-password silently returns HTTP 200. The behavior difference is intentional for enumeration safety on the forgot-password route, but the inconsistency may surprise consumers of the API.

3. **Dev mode prints raw OTP to stdout.** `MailService` falls back to `process.stdout.write` (including the raw OTP in the email body) when SMTP fails in non-production. If `isProduction` is misconfigured or stdout is captured/logged, OTPs could leak.

4. **`isWithinResendCooldown` only checks `consumedAt: null`.** If the previous OTP has been consumed (via `invalidateActive` just before the cooldown check in a race), the cooldown check returns `false` prematurely. Two back-to-back resend requests racing at the boundary could each succeed.

5. **No bcrypt cost control via configuration.** `PasswordService` hardcodes `BCRYPT_COST = 12`. There is no env var to tune this for high-volume token rotation without a code change.

---

## 24. Recommended Policy

> The following are recommendations only. No code has been changed.

| #   | Recommendation                                                                                                                                               | Priority |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | Add a time-based lockout after max OTP attempts — e.g., 10-minute block per `userId` after 5 wrong OTPs                                                      | High     |
| 2   | Add per-attempt rate limiting on verify-OTP endpoints (2–3 attempts/min/IP) to close burst-guessing                                                          | High     |
| 3   | Fix the TOCTOU gap — use an atomic `UPDATE ... WHERE consumed_at IS NULL` inside the transaction and check `count === 1` before proceeding                   | High     |
| 4   | Add an hourly/daily OTP send cap — e.g., max 10 OTP emails per account per 24 hours                                                                          | Medium   |
| 5   | Use a persistent throttler store (Redis) so rate-limit windows survive server restarts                                                                       | Medium   |
| 6   | Revoke access tokens after password reset — store the reset timestamp on the user and reject JWTs issued before it, or add existing JTIs to `revoked_tokens` | Medium   |
| 7   | Add a scheduled job to purge expired/consumed OTP records older than N days                                                                                  | Low      |
| 8   | Add account-level login attempt lockout independent of IP-based rate limiting                                                                                | Medium   |
