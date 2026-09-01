# Orders (ORD-01–ORD-07)

Status: **done** in `apps/backend/src/orders`.

Members build a cart while the lobby is `open`. Prices come from the menu `referencePrice` or an admin lobby-wide override. Billing later patches `actualPrice` / `delivered` on the same `order_items` rows.

Depends on: JWT, a lobby membership (`LobbyMemberGuard` / `LobbyAdminGuard`), and an active menu item on the lobby’s restaurant.

## Task checklist

| ID     | Task                | Done when                                                                                    |
| ------ | ------------------- | -------------------------------------------------------------------------------------------- |
| ORD-01 | Add item            | Open lobby; qty ≥ 1; price is reference or existing lobby override; members cannot set price |
| ORD-02 | Update qty / remove | Owner only; open lobby                                                                       |
| ORD-03 | Get my items        | Member JWT; personal subtotal                                                                |
| ORD-04 | Admin roster        | All members’ lines + grand subtotal                                                          |
| ORD-05 | Kitchen summary     | Aggregated qty per `menuItemId`                                                              |
| ORD-06 | Price override      | Admin; `open` or `locked`; updates every existing line of that item                          |
| ORD-07 | Guards              | `LobbyMemberGuard` / `LobbyAdminGuard` load membership from JWT `sub`                        |

## HTTP

Member prefix: `/api/lobbies/:lobbyId/orders` (`LobbyMemberGuard`).

| Method   | Path             | Who    | Status |
| -------- | ---------------- | ------ | ------ |
| `POST`   | `/items`         | member | `open` |
| `PATCH`  | `/items/:itemId` | owner  | `open` |
| `DELETE` | `/items/:itemId` | owner  | `open` |
| `GET`    | `/items`         | member | any    |

Admin prefix: `/api/lobbies/:lobbyId/admin/orders` (`LobbyAdminGuard`).

| Method  | Path                            | Who   | Status             |
| ------- | ------------------------------- | ----- | ------------------ |
| `GET`   | `/`                             | admin | any                |
| `GET`   | `/summary`                      | admin | any                |
| `PATCH` | `/menu-items/:menuItemId/price` | admin | `open` or `locked` |

Add body:

```json
{
  "menuItemId": "55555555-5555-4555-8555-555555555555",
  "qty": 2
}
```

Override body: `{ "actualPrice": "35.00" }`. Later adds of the same menu item inherit that price.

`actualPrice` is nullable in Postgres so billing can leave a delivered line unpriced until the admin patches it (BILL-11).
