# Lobbies (LOBBY-01–LOBBY-08)

Status: **done** in `apps/backend/src/lobbies`.

A lobby is a shared order at one restaurant. The creator is the **admin**. Others join by a 6-character code. Billing treats `locked` as “arrived”.

Depends on: JWT (`docs/backend-auth.md`) and an active restaurant. Orders and billing sit on top of this lifecycle.

## Task checklist

| ID       | Task                    | Done when                                                                 |
| -------- | ----------------------- | ------------------------------------------------------------------------- |
| LOBBY-01 | Create lobby            | Registered user; unique 6-char code; creator is admin                     |
| LOBBY-02 | Join by code            | Open, not expired, not full; idempotent if already a member               |
| LOBBY-03 | Lookup                  | `GET` by id or code; JWT required; membership not required                |
| LOBBY-04 | Lock                    | Admin; `open` → `locked`; blocks joins and cart edits                     |
| LOBBY-05 | Reopen                  | Admin; `locked` → `open` (not from `billed`)                              |
| LOBBY-06 | Remove member           | Admin; cannot remove the admin                                            |
| LOBBY-07 | Leave                   | Regular member; open lobby only; admin cannot leave                       |
| LOBBY-08 | Code uniqueness         | Retry on collision; **409** if a unique code cannot be allocated          |

## HTTP

Prefix: `/api/lobbies`. Bearer JWT on every route. Create also requires `RegisteredUserGuard`.

| Method   | Path                     | Who          | Notes                                      |
| -------- | ------------------------ | ------------ | ------------------------------------------ |
| `POST`   | `/`                      | registered   | Body: restaurant, optional cap / expiry    |
| `POST`   | `/join`                  | any JWT      | `{ "code": "B12F7K", "displayName"? }`     |
| `GET`    | `/code/:code`            | any JWT      | Code is case-insensitive, stored uppercase |
| `GET`    | `/:id`                   | any JWT      | UUID                                       |
| `PATCH`  | `/:id/lock`              | lobby admin  | **409** if not `open`                      |
| `PATCH`  | `/:id/reopen`            | lobby admin  | **409** if not `locked`                    |
| `DELETE` | `/:id/members/:memberId` | lobby admin  | Cannot remove the admin                    |
| `DELETE` | `/:id/leave`             | regular member | **409** if not `open`                    |

Create body (optional fields omitted for an uncapped lobby with no expiry):

```json
{
  "restaurantId": "11111111-1111-4111-8111-111111111111",
  "maxMembers": 8,
  "expiryMinutes": 30,
  "instaPayHandle": "ahmed.gamal"
}
```

`expiryMinutes` and `expiresAt` are mutually exclusive. `instaPayHandle` falls back to the creator profile handle.

Join is idempotent: the same user joining again returns `alreadyMember: true` without creating a second row.

## Status machine

`open` → `locked` (admin lock, or “arrived” for billing) → `billed` (finalise). Admin reopen is only `locked` → `open`. Billing reopen is `billed` → `locked`.

## Layout

```
apps/backend/src/lobbies/
  controllers/lobbies.controller.ts
  services/lobbies.service.ts
  services/lobby-members.service.ts
  domain/lobby-code.ts
  domain/lobby-rules.ts
  repositories/lobby.repository.ts
```
