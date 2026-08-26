# Billing (BILL-01–BILL-16)

Status: **done** in `apps/backend/src/billing`.

CSV “arrived” is `lobbies.status = locked`. Finalise moves the lobby to `billed` (payment). Reopen returns it to `locked`.

Identity for now: header `x-user-id` (UUID v4). MEM-03 is not in this slice; admin vs member is `lobby_members.role`.

## Task checklist

| ID      | Task                     | Done when                                                                  |
| ------- | ------------------------ | -------------------------------------------------------------------------- |
| BILL-01 | LobbyBill entity         | 1:1 with lobby; unique `lobby_id`; money via `MoneyTransformer`            |
| BILL-02 | Proportional floors      | Hamilton floor of each member’s share                                      |
| BILL-03 | Largest remainder        | Leftover piastres, then larger subtotal, then id                           |
| BILL-04 | Edge cases               | All-zero subtotals; negative net fees (discount > fees)                    |
| BILL-05 | Property tests           | 10 000 fast-check cases                                                    |
| BILL-06 | `GET …/bill/draft`       | Grouped by `menuItemId`; suggested actual = reference × qty; admin+arrived |
| BILL-07 | `PATCH …/bill/lines`     | Prices + delivered flags; lines must belong to the lobby; one transaction  |
| BILL-08 | `applyToAllMatching`     | One price copied to every line with that `menuItemId`                      |
| BILL-09 | `POST …/bill/preview`    | Totals, balances, reconciliation; no writes                                |
| BILL-10 | Reconciliation           | Optional receipt total; `warns` if it differs; never blocks                |
| BILL-11 | `POST …/bill/finalise`   | One transaction; `PRICES_INCOMPLETE`; idempotency key; invariant block     |
| BILL-12 | Zero-balance auto-settle | No delivered items → `payment_status = paid`                               |
| BILL-13 | `POST …/bill/reopen`     | Back to arrived; `BILL_LOCKED` if any member is `paid`                     |
| BILL-14 | `GET …/bill`             | Any member; everyone sees everyone else’s totals                           |
| BILL-15 | Atomicity                | Injected failure after bill/lines/members/status → zero bill rows          |
| BILL-16 | Undelivered exclusion    | Owner subtotal drops; fee base shrinks; others’ fee share rises            |

## Allocator

`allocateFees(parties, netFees)` in `allocator.ts`. `netFees` = delivery + service − discount (may be negative).

## HTTP

Prefix: `/api/lobbies/:lobbyId/bill`

| Method | Path        | Who    |
| ------ | ----------- | ------ |
| GET    | `/draft`    | admin  |
| PATCH  | `/lines`    | admin  |
| POST   | `/preview`  | admin  |
| POST   | `/finalise` | admin  |
| POST   | `/reopen`   | admin  |
| GET    | `/`         | member |

`PATCH /lines` body:

```json
{
  "lines": [{ "id": "<orderItemId>", "actualPrice": "36.87", "delivered": true }],
  "applyToAllMatching": true
}
```

`POST /preview` and `/finalise` body: `deliveryFee`, `serviceFee`, `discount`, optional `receiptTotal` (EGP strings). Finalise also accepts `Idempotency-Key`.

## Schema add-ons (migration `20240101000011_billing_columns`)

- `order_items.delivered` (default true)
- `order_items.actual_price` nullable until priced
- `lobby_members.payment_status`
- `lobby_bill.delivery_fee`, `service_fee`, `discount`, `receipt_total`, `idempotency_key`
