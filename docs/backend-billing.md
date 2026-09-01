# Billing (BILL-01–BILL-17)

Status: **done** in `apps/backend/src/billing`.

CSV **arrived** is stored as `lobbies.status = locked`. Finalise moves the lobby to `billed` (payment). Reopen returns it to `locked`.

Identity comes from the access token (`@CurrentUser('id')` → JWT `sub`), the same as lobbies and orders. Admin vs member is still `lobby_members.role` via `LobbyAccessService`. A valid Bearer token is required; a spoofable `x-user-id` header is not used.

Depends on: JWT (`docs/backend-auth.md`), catalog money prices, a locked lobby with members and order lines.

## Task checklist

| ID      | Task                           | Done when                                                                                           |
| ------- | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| BILL-01 | LobbyBill entity               | One-to-one with lobby, unique-constrained; money via transformer                                    |
| BILL-02 | Allocator: proportional floors | Integer floor of each line's share                                                                  |
| BILL-03 | Allocator: largest-remainder   | Leftover piastres largest-fraction-first; tie-break by larger subtotal, then id                     |
| BILL-04 | Allocator: edge cases          | `subtotal === 0` (equal split); negative net fees when discount exceeds fees                        |
| BILL-05 | Allocator property tests       | 10 000 fast-check cases: sum equals input; no negative share when fees ≥ 0; larger subtotal ≥ share |
| BILL-06 | `GET /bill/draft`              | Lines grouped by `menuItemId`; suggested actual = reference × qty; admin only; arrived only         |
| BILL-07 | `PATCH /bill/lines`            | Prices and delivery flags; every line must belong to this lobby; one transaction                    |
| BILL-08 | `applyToAllMatching`           | One price copied to every line sharing that `menuItemId`                                            |
| BILL-09 | `POST /bill/preview`           | Totals, balances, reconciliation; no writes; repeatable                                             |
| BILL-10 | Reconciliation                 | Optional receipt total vs computed; `warns` if they differ; never blocks                            |
| BILL-11 | `POST /bill/finalise`          | One transaction; `PRICES_INCOMPLETE` if a delivered line lacks a price; idempotency key; invariant  |
| BILL-12 | Zero-balance auto-settle       | Member with no delivered items is `paid` on finalise                                                |
| BILL-13 | `POST /bill/reopen`            | Back to arrived; `BILL_LOCKED` if any member is `paid`                                              |
| BILL-14 | `GET /bill`                    | Any member; full transparency including others' totals                                              |
| BILL-15 | Atomicity test                 | Injected failure after bill / lines / members / status → no `lobby_bill` row; status still arrived  |
| BILL-16 | Undelivered exclusion          | Owner subtotal drops by that line; fee base excludes it; others' shares rise; invariant holds       |
| BILL-17 | JWT identity                   | Actor is `req.user.id`; billing no longer reads `x-user-id`                                         |

## Allocator

`allocateFees(parties, netFees)` in `allocator.ts`.

`netFees` = delivery + service − discount (may be negative).

1. Weight = member items subtotal (delivered lines with a price only).
2. If every subtotal is 0, split equally.
3. Floor each share toward −∞ (`floorDiv`).
4. Hand leftover piastres largest remainder first; ties prefer larger subtotal, then `id`.

Property tests live in `allocator.property.spec.ts` (`numRuns: 10_000`).

## HTTP

Prefix: `/api/lobbies/:lobbyId/bill`. Requires Bearer JWT. `LobbyAccessService` then checks membership (GET `/`) or admin (everything else).

| Method  | Path        | Who    | Status required    |
| ------- | ----------- | ------ | ------------------ |
| `GET`   | `/draft`    | admin  | arrived (`locked`) |
| `PATCH` | `/lines`    | admin  | arrived            |
| `POST`  | `/preview`  | admin  | arrived            |
| `POST`  | `/finalise` | admin  | arrived → `billed` |
| `POST`  | `/reopen`   | admin  | `billed` → arrived |
| `GET`   | `/`         | member | bill exists        |

`PATCH /lines` body:

```json
{
  "lines": [{ "id": "<orderItemId>", "actualPrice": "36.87", "delivered": true }],
  "applyToAllMatching": true
}
```

`POST /preview` and `POST /finalise` body (EGP strings):

```json
{
  "deliveryFee": "15.00",
  "serviceFee": "5.00",
  "discount": "0",
  "receiptTotal": "120.00"
}
```

Finalise also accepts `Idempotency-Key` or `idempotencyKey` on the body. Repeating the same key after success returns the existing bill. A delivered line with `actualPrice: null` returns **422** `PRICES_INCOMPLETE`.

Reopen deletes the `lobby_bill` row and resets member `payment_status` to `unpaid`, unless anyone is already `paid` (**409** `BILL_LOCKED`).

`GET /bill` rebuilds the invariant from stored fees so every member sees every member's totals.

## Invariant block

Preview, finalise, and get all return (or include) the same shape from `buildInvariant`:

- `subtotal`, `deliveryFee`, `serviceFee`, `discount`, `netFees`, `tax`, `total`
- `members[]` — `itemsSubtotal`, `feesShare`, `total`, `paymentStatus`
- `allocations[]`
- `reconciliation` — `{ receiptTotal, computedTotal, difference, warns }`

`tax` currently mirrors `serviceFee`. Undelivered lines are omitted from the fee base (BILL-16).

## Schema

Migration `20240101000011_billing_columns`:

- `order_items.delivered` (default true)
- `order_items.actual_price` nullable until priced (`>= 0` when set)
- `lobby_members.payment_status`
- `lobby_bill.delivery_fee`, `service_fee`, `discount`, `receipt_total`, `idempotency_key` (unique)

`lobby_bill.lobby_id` stays unique (one bill per lobby).
