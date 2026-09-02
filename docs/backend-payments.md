# Payments & settlement (PAY-01–PAY-09)

Status: **done** in `apps/backend/src/payments`.

Honor-system InstaPay: members send money to the lobby handle outside the app, then **claim**; the host **confirms or rejects**; the host **settles** when everyone who owes has paid.

Depends on: JWT, a **billed** lobby (see [`backend-billing.md`](./backend-billing.md)), `LobbyAccessService`.

## Task checklist

| ID     | Task                  | Done when                                                                                                               |
| ------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| PAY-01 | `PaymentClaim` entity | Claim rows + `claim_status`; one pending claim per member                                                               |
| PAY-02 | `GET /payments`       | Board: my total, handle, collected/total, members, waitingOn                                                            |
| PAY-03 | Amounts from BILL-14  | `buildInvariant` via `BillingService.getBill`; no second allocator                                                      |
| PAY-04 | `POST /claim`         | Member `unpaid → pending`; host cannot claim; idempotent if already pending                                             |
| PAY-05 | `POST /…/confirm`     | Admin `pending → paid`                                                                                                  |
| PAY-06 | `POST /…/reject`      | Admin `pending → unpaid`; member may claim again                                                                        |
| PAY-07 | Error codes           | `NOT_IN_PAYMENT`, `CLAIM_NOT_PENDING`, `ALREADY_PAID`, `CANNOT_CLAIM_AS_HOST`, `SETTLEMENT_INCOMPLETE`, `LOBBY_SETTLED` |
| PAY-08 | `POST /settle`        | Admin; all owing members `paid` → lobby `settled`                                                                       |
| PAY-09 | GET after settle      | Board still readable; mutations 409 `LOBBY_SETTLED`                                                                     |

## HTTP

Prefix: `/api/lobbies/:lobbyId/payments`. Bearer JWT. Membership via `LobbyAccessService`.

| Method | Path                         | Who              | Notes                                  |
| ------ | ---------------------------- | ---------------- | -------------------------------------- |
| `GET`  | `/`                          | member           | `billed` or `settled`                  |
| `POST` | `/claim`                     | member, not host | Optional `note`, `Idempotency-Key`     |
| `POST` | `/members/:memberId/confirm` | admin            | Pending claim required                 |
| `POST` | `/members/:memberId/reject`  | admin            | Returns member to `unpaid`             |
| `POST` | `/settle`                    | admin            | Blocked while `waitingOn` is non-empty |

The host is treated as **paid** on the board (they already paid the restaurant). Members with `total === 0` are paid (BILL-12). Settle waits only on owing non-admin members.

## Layout

```
apps/backend/src/payments/
  controllers/payments.controller.ts
  services/payments.service.ts
  domain/payment-rules.ts
  domain/payment-unique-errors.ts
  entities/payment-claim.entity.ts
  dto/claim-payment.dto.ts
  dto/payment-board-response.dto.ts
  repositories/payment.repository.ts
  testing/payment-fixtures.ts
  payments.module.ts
```
