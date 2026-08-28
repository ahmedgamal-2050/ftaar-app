# Catalog restaurants (CATALOG REST-01–REST-06)

Status: **done** in `apps/backend/src/restaurants`, mapped from `backend_catalog.csv`.

Writes require a **registered** JWT. Reads work with any access token. Guests never see `isActive: false` rows; registered users may pass `?includeInactive=true`.

## Task checklist

| ID      | Task                             | Done when                                                                              |
| ------- | -------------------------------- | -------------------------------------------------------------------------------------- |
| REST-01 | Entity + soft-delete scope       | Default queries exclude `isActive: false`                                              |
| REST-02 | `GET /restaurants`               | Case-insensitive search (Arabic `ILIKE`); paginated; max `limit` 100                   |
| REST-03 | `POST /restaurants`              | Name ≥ 2 characters; registered users only                                             |
| REST-04 | `PATCH /restaurants/:id`         | Partial update                                                                         |
| REST-05 | DELETE soft + reference guard    | Sets `isActive: false`; **409** if an `open` / `locked` / `billed` lobby references it |
| REST-06 | `GET /restaurants/:id` with menu | Active menu sorted by category then name; `?includeInactive` for managers              |

## HTTP

Prefix: `/api`.

| Method   | Path                                | Auth       |
| -------- | ----------------------------------- | ---------- |
| `GET`    | `/restaurants?search=&page=&limit=` | any JWT    |
| `POST`   | `/restaurants`                      | registered |
| `GET`    | `/restaurants/:id?includeInactive=` | any JWT    |
| `PATCH`  | `/restaurants/:id`                  | registered |
| `DELETE` | `/restaurants/:id`                  | registered |

List response:

```json
{
  "items": [{ "id": "…", "name": "مطعم الفحام", "isActive": true }],
  "page": 1,
  "limit": 20,
  "total": 3
}
```

Default `limit` is 20. Values above 100 are clamped to 100. `search` uses PostgreSQL `ILIKE` (`mode: 'insensitive'`), so Latin case and Arabic substrings both match.

Detail includes `menu` (same shape as `GET /restaurants/:id/menu`).

Create body: `{ "name": "بيت الكبسة" }`. Duplicate names (including case-insensitive) return **409** `ALREADY_EXISTS`.

## Schema

Migration `20260828000001_restaurants_name_lower`: unique index on `lower(name)`.
