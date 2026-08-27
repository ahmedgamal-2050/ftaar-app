# Catalog menu (CATALOG MENU-01–MENU-07)

Status: **done** in `apps/backend/src/menu`, mapped from `backend_catalog.csv`.

Menu writes require a **registered** JWT (`RegisteredUserGuard`). Guests can still **read** a restaurant menu with a valid access token.

## Task checklist

| ID      | Task                              | Done when                                                                 |
| ------- | --------------------------------- | ------------------------------------------------------------------------- |
| MENU-01 | MenuItem entity                   | `referencePrice` is a `Money` column; values `< 0` are rejected           |
| MENU-02 | `POST /restaurants/:id/menu`      | Registered users only                                                     |
| MENU-03 | `GET /restaurants/:id/menu`       | Sorted by category then name; `?includeInactive=true`                     |
| MENU-04 | `PATCH /menu-items/:id`           | Partial update                                                            |
| MENU-05 | Soft delete + RESTRICT            | Never hard-deletes; referenced rows return **409** without `force=true`   |
| MENU-06 | `POST /restaurants/:id/menu/bulk` | Up to 200 items, one transaction; per-row errors with index               |
| MENU-07 | Snapshot integrity test           | Order an item, deactivate it, historical `actual_price` + name still load |

## HTTP

Prefix: `/api`.

| Method   | Path                                     | Auth       |
| -------- | ---------------------------------------- | ---------- |
| `POST`   | `/restaurants/:id/menu`                  | registered |
| `GET`    | `/restaurants/:id/menu?includeInactive=` | any JWT    |
| `POST`   | `/restaurants/:id/menu/bulk`             | registered |
| `PATCH`  | `/menu-items/:id`                        | registered |
| `DELETE` | `/menu-items/:id?force=`                 | registered |

Create body:

```json
{
  "name": "كبسة دجاج",
  "category": "أطباق",
  "referencePrice": "36.87",
  "isActive": true
}
```

`referencePrice` is an EGP string. JSON responses serialise it as `"36.87"` via `Money`.

Bulk body: `{ "items": [ /* same shape, 1–200 */ ] }`. Duplicate names in the payload (case-insensitive) return **422** `UNPROCESSABLE_ENTITY` with `error.details.errors: [{ index, message }]`. More than 200 items return **413** `PAYLOAD_TOO_LARGE`. The transaction rolls back if any row fails.

Soft delete sets `is_active = false`. If `order_items` reference the row and `force` is omitted, the API returns **409** `CONFLICT`. `force=true` still only deactivates; the database FK stays `ON DELETE RESTRICT`.

## Schema

Migration `20260826000001_menu_item_category_price_unique`:

- `menu_items.category` (`VARCHAR(120)`, default `''`)
- `ck_menu_items_reference_price` (`reference_price >= 0`)
- `uq_menu_items_name_lower` (`restaurant_id`, `lower(name)`)
