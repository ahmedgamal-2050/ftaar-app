# Mobile auth flow (frontend)

Status: **done** in `apps/mobile`, wired against the real `apps/backend` auth API (`apps/backend/src/auth/*`). Every screen below makes real network calls — nothing is a local-only placeholder.

## Screens

| Screen                     | Route                                          | Backend call(s)                                                                |
| -------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| Welcome                    | `OnboardingStack.Welcome`                      | —                                                                              |
| Choose your name           | `OnboardingStack.ChooseName`                   | `POST /auth/guest`                                                             |
| Register (guest → account) | `ProfileStack` / `OnboardingStack` `.Register` | `POST /auth/convert`, `PATCH /auth/me`                                         |
| Login                      | `.Login`                                       | `POST /auth/login`                                                             |
| Profile                    | `ProfileStack.ProfileScreen`                   | — (reads session state)                                                        |
| Forgot password            | `.ForgotPassword`                              | `POST /auth/forgot-password`                                                   |
| Enter reset code           | `.ForgotPasswordOtp`                           | `POST /auth/forgot-password/verify-otp`, `POST /auth/forgot-password` (resend) |
| Set new password           | `.ResetPassword`                               | `POST /auth/reset-password`                                                    |

`Login`, `ForgotPassword`, `ForgotPasswordOtp`, and `ResetPassword` are registered in **both** `OnboardingStack` (reachable from Welcome, for a device with no session at all) and `ProfileStack` (reachable from a guest's Profile). Same screen components in both places — see [Shared screens across two navigators](#shared-screens-across-two-navigators).

## How to run

```sh
npx nx run backend:serve   # API on :3000 (or override PORT — see apps/backend/.env)
npx nx run mobile:start    # Expo dev server
```

| Variable                 | Required | Default                     | Notes                                                                                      |
| ------------------------ | -------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| `EXPO_PUBLIC_API_URL`    | no       | `http://localhost:3000/api` | On an Android emulator this must be `http://10.0.2.2:<port>/api` to reach the host machine |
| `EXPO_PUBLIC_SOCKET_URL` | no       | `http://localhost:3000`     | Unused by auth; reserved for later phases                                                  |

Copy `apps/mobile/.env.example` to `apps/mobile/.env` and adjust for your setup (gitignored).

## Layout

```
apps/mobile/src/
  api/
    client.ts                 # axios instance: envelope unwrap, 401 refresh-and-retry
    endpoints/auth.ts          # typed calls for every /auth/* route
    types.ts                   # AuthUser / AuthSession / envelope types, mirroring the backend
  auth/
    AuthContext.tsx            # session state machine — the only place screens read/mutate auth
    session.ts                 # SessionUser shape + toSessionUser() mapping
    storage.ts                 # SecureStore (refresh token, device id) + AsyncStorage (guest name, language)
  modules/
    onboarding/screens/        # Welcome, ChooseName
    account/screens/           # Register, Login, Profile, ForgotPassword*, ResetPassword
  navigation/
    OnboardingStack.tsx        # Welcome → ChooseName, plus Login/ForgotPassword* for existing accounts
    MainTabs.tsx                # ProfileStack registers Register/Login/ForgotPassword* too
  ui/components/
    TextField.tsx, Button.tsx, ErrorBanner.tsx, LanguageToggle.tsx   # new primitives this work added
```

## Backend contract — what the API actually returns

Read directly from `apps/backend/src/**`, not assumed. Three things the frontend has to account for that aren't obvious from a glance at the routes:

- **Every response is wrapped.** Success: `{ success: true, data: T }`. Error: `{ success: false, error: { code, message, details? } }` (`core/http/response-wrap.interceptor.ts`, `core/http/all-exceptions.filter.ts`). `client.ts` unwraps success responses in a response interceptor, so every `authApi` call returns `data` directly. `getApiError(err)` reads `{ code, message }` off a caught `AxiosError` for inline error banners.
- **Tokens are flat.** `POST /auth/guest|login|convert|refresh` all return `{ accessToken, refreshToken, user }` — not nested under a `tokens` key.
- **The user object has no `isGuest` field.** It's `SafeUser` (the Prisma `User` row minus `passwordHash`): `{ id, kind: 'guest' | 'registered', email, displayName, instaPayHandle, emailVerifiedAt, createdAt, updatedAt }`. `isGuest` is derived client-side in `session.ts` as `kind !== 'registered'`.

## Session lifecycle (`AuthContext.tsx`)

`AuthStatus` is `'bootstrapping' | 'needs-onboarding' | 'ready' | 'error'`. `RootNavigator` renders `OnboardingStack` while `needs-onboarding`, `MainTabs` otherwise — swapping automatically whenever `status` changes.

- **`bootstrap()`** (on app start): if a refresh token is stored, calls `POST /auth/refresh` and resolves the session; a failed refresh (expired/revoked, not exceptional) falls back to `needs-onboarding` rather than showing an error screen.
- **`completeOnboarding(displayName)`**: calls `POST /auth/guest` **exactly once** and persists the returned refresh token — see [Guest identity](#guest-identity-is-a-backend-gap-worked-around-client-side).
- **`login(email, password)`**: `POST /auth/login`, replaces the session.
- **`register(email, password)`**: `POST /auth/convert` (bearer-authed with the current guest's access token), then `PATCH /auth/me { displayName }` to sync the name that was "carried over" from the guest session — see [Guest → registered conversion](#guest--registered-conversion-has-no-otp-step).
- **`logout()`**: best-effort `POST /auth/logout`, then clears local state regardless of whether the network call succeeds.

Token storage: refresh token in `expo-secure-store` (`storage.ts`), access token in an in-memory `tokenStore` (read synchronously by `client.ts`'s request interceptor, outside React).

## Design decisions forced by the real backend

### Guest identity is a backend gap, worked around client-side

`POST /auth/guest` takes **no body** — `GuestDto` (with a `deviceId` field) exists but the controller method never reads it, and `AuthService.guest()` mints a brand-new anonymous user on every call. The frontend never fixes this server-side; instead `completeOnboarding()` calls `guest()` once and persists the resulting refresh token. Identity durability comes from that stored token surviving app restarts (via `POST /auth/refresh`), not from any device fingerprint.

### Guest → registered conversion has no OTP step

The Register screen's copy ("Carried over from your guest session") and the fact that onboarding always creates a guest first both point to `POST /auth/convert`, not the public `POST /auth/register`. Unlike `register()` (which creates an unverified account and requires `POST /auth/register/verify-otp` before issuing tokens), `convert()` is guarded by the caller's guest bearer token and returns tokens immediately — no OTP screen needed. The public `register`/`verify-otp`/`resend-otp` endpoints are **unused by this UI**; nothing in the app reaches them, since onboarding is always guest-first.

### Guests can't set their own display name server-side

`UserRepositoryService.createGuest()` hardcodes `displayName: 'Guest'`, and `PATCH /auth/me` is blocked for guests (`RegisteredUserGuard`). The name typed on `ChooseName` is cached locally (`storage.ts` → `AsyncStorage`, key `ftaar.guestDisplayName`) and shown as an override until conversion, at which point `register()` calls `PATCH /auth/me` to actually persist it server-side.

### Shared screens across two navigators

`Login`, `ForgotPassword`, `ForgotPasswordOtp`, and `ResetPassword` are pushed from both `OnboardingStack` (Welcome's "Already have an account?" link, for a device with no session at all) and `ProfileStack` (a guest's Profile). Rather than typing each screen's `navigation`/`route` props against one stack's full param list, they're typed against a small shared route subset (e.g. `type Routes = { Login: undefined; ForgotPassword: undefined }`) that both `OnboardingStackParamList` and `ProfileStackParamList` satisfy structurally.

## Bugs found during manual testing (and fixed)

Both were the same root cause in different clothes: **a screen keeps its `submitting` state stuck `true` forever if the only place it gets reset to `false` is the `catch` block.**

1. **401 with no retry on `/auth/convert`.** `client.ts`'s response interceptor blanket-excluded every `/auth/*` path from its refresh-and-retry logic — correct for public endpoints (`login`, `guest`, `register`, `refresh` itself, `forgot-password`, …) but wrong for bearer-authed ones (`convert`, `logout`, `me`). A guest access token expiring (15 min) before the user tapped "Create account" 401'd with no retry attempt at all. Fixed by replacing the prefix check with an explicit `PUBLIC_AUTH_ENDPOINTS` set. Covered by `apps/mobile/src/api/client.spec.ts`.
2. **Buttons stuck spinning forever on success.** `RegisterScreen`, `LoginScreen`, `ForgotPasswordScreen`, and `ForgotPasswordOtpScreen` all `await`ed their API call, then either navigated or fell through — but only reset `submitting` in `catch`. Two different failure shapes:
   - `Register`/`Login` call `navigation.goBack()` on success but never reset `submitting` — harmless _unless_ something delays the pop, but the real bug was simpler: the reset was missing entirely, so if the screen is ever revisited before unmount finishes, it's stuck.
   - `ForgotPassword`/`ForgotPasswordOtp` call `navigation.navigate(...)` forward, which **pushes** a new screen rather than unmounting the current one. The screen stays mounted underneath, `submitting` never resets, and going back to it (e.g. from the OTP screen to re-enter the email) reveals a permanently disabled, spinning button — even though the request had already succeeded.

   Fixed by explicitly resetting `submitting`/calling the reset alongside every successful navigation, not just in `catch`. Covered by regression tests in each screen's spec (e.g. `ForgotPasswordScreen.spec.tsx`'s "does not leave the Send code button stuck spinning after navigating forward", which navigates back and asserts the button isn't stuck disabled).

## Test coverage

`npx nx run mobile:test` — 94 tests across 27 suites, all passing. Highlights:

- `AuthContext.spec.tsx` — bootstrap/refresh, guest bootstrap, conversion + display-name sync, login, logout, all against a mocked `authApi` (not a live server).
- `client.spec.ts` — the 401 refresh-decision logic (bearer-authed vs. public endpoints), using a custom axios adapter rather than a mocking library.
- One spec per screen — form validation, loading/disabled states, success navigation, and backend error-code → friendly-message mapping (`EMAIL_ALREADY_REGISTERED`, `INVALID_CREDENTIALS`, `INVALID_OTP`, `OTP_EXPIRED`, `OTP_TOO_MANY_ATTEMPTS`, `INVALID_RESET_TOKEN`).
- `OnboardingStack.spec.tsx` / `MainTabs.spec.tsx` — every route above is actually reachable by navigation, not just registered.

## Known gaps

- **Hero imagery is icon placeholders**, not the food photography in the original mockups — no real image assets exist in the repo and none could be sourced for this work. Same layout/positioning, swap-in-ready.
- **"Help & Support" is a static row** — no destination screen exists yet.
- **The public `/auth/register` + OTP verification path is unbuilt.** If a "sign up without ever being a guest" entry point is wanted later, it needs its own OTP screen (registration OTP has different backend policy than password-reset OTP — see `docs/auth-otp-security-audit.md`); today every account starts as a guest, so nothing reaches it.
