# Orders Feature Technical Documentation

Comprehensive documentation for the **Orders Feature** in the `ftaar-app` backend (`apps/backend/src/orders`).

---

## 1. Overview & Architecture

The **Orders Feature** enables users within a shared group ("Lobby") to browse restaurant menu items, build individual cart selections, and view member subtotals. It also provides administrative tools for lobby admins to manage prices, inspect detailed roster selections, and view an aggregated kitchen order summary when placing the group order with the restaurant.

### Core Technologies

- **Framework**: NestJS (TypeScript)
- **Database & ORM**: PostgreSQL with Prisma ORM (`PrismaService`)
- **Currency & Money**: Custom `Money` domain class representing amounts in piastres (`BigInt` in database) to ensure zero floating-point rounding errors.
- **Error Handling**: Unified `AppError` exception filter (`NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `VALIDATION_ERROR`).
- **Security & Authorization**: `JwtAuthGuard` combined with custom guards (`LobbyMemberGuard`, `LobbyAdminGuard`) and `@CurrentUser()` decorator.

---

## 2. Data Models & Entities

### Prisma Schema (`OrderItem`)

```prisma
model OrderItem {
  id            String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  lobbyId       String      @map("lobby_id") @db.Uuid
  lobby         Lobby       @relation(fields: [lobbyId], references: [id], onDelete: Cascade)
  lobbyMemberId String      @map("lobby_member_id") @db.Uuid
  lobbyMember   LobbyMember @relation(fields: [lobbyMemberId], references: [id])
  menuItemId    String      @map("menu_item_id") @db.Uuid
  menuItem      MenuItem    @relation(fields: [menuItemId], references: [id])
  restaurantId  String      @map("restaurant_id") @db.Uuid
  qty           Int
  actualPrice   BigInt      @map("actual_price")
  createdAt     DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)

  @@index([lobbyId], map: "idx_order_items_lobby_id")
  @@index([menuItemId], map: "idx_order_items_menu_item_id")
  @@map("order_items")
}
```

### Domain Entity (`OrderItem`)

Located in `apps/backend/src/orders/entities/order-item.entity.ts`.

- Encapsulates database rows into a rich domain model.
- Converts `actualPrice` (`BigInt` piastres) to a `Money` instance.
- Computes `lineTotal = actualPrice * qty`.
- Formats EGP currency strings (`"25.50"`) for JSON responses via `.toResponse()`.

---

## 3. API Endpoints Reference

### Member Endpoints (`/api/lobbies/:lobbyId/orders`)

_Protected by `JwtAuthGuard` and `LobbyMemberGuard`._

#### 1. Add Item to Order

- **`POST /api/lobbies/:lobbyId/orders/items`**
- **Body**:
  ```json
  {
    "menuItemId": "55555555-5555-4555-8555-555555555555",
    "qty": 2
  }
  ```
- **Behavior**:
  - Validates lobby is `open`.
  - Verifies menu item belongs to the lobby's restaurant and is active.
  - Price is strictly enforced: defaults to the menu item's reference price or inherits any existing lobby price override set by the admin. Regular members **cannot** pass or alter item prices.
  - Creates or increments item quantity for the member.
- **Returns**: Current member's order items and updated subtotal.

#### 2. Update Item Quantity

- **`PATCH /api/lobbies/:lobbyId/orders/items/:itemId`**
- **Body**:
  ```json
  {
    "qty": 3
  }
  ```
- **Behavior**: Updates quantity for an item owned by the member in an open lobby.
- **Returns**: Current member's order items and updated subtotal.

#### 3. Remove Item

- **`DELETE /api/lobbies/:lobbyId/orders/items/:itemId`**
- **Behavior**: Removes specified order item from member's cart in an open lobby.
- **Returns**: Current member's order items and updated subtotal.

#### 4. Get My Order Items

- **`GET /api/lobbies/:lobbyId/orders/items`**
- **Behavior**: Retrieves current authenticated member's order items and calculates personal subtotal.
- **Sample Response**:
  ```json
  {
    "items": [
      {
        "id": "66666666-6666-4666-8666-666666666666",
        "lobbyId": "22222222-2222-4222-8222-222222222222",
        "lobbyMemberId": "44444444-4444-4444-8444-444444444444",
        "menuItemId": "55555555-5555-4555-8555-555555555555",
        "restaurantId": "33333333-3333-4333-8333-333333333333",
        "qty": 2,
        "actualPrice": "25.00",
        "lineTotal": "50.00",
        "createdAt": "2026-08-26T00:00:00.000Z",
        "menuItem": {
          "id": "55555555-5555-4555-8555-555555555555",
          "name": "فول",
          "category": "أطباق"
        }
      }
    ],
    "subtotal": "50.00"
  }
  ```

---

### Admin Endpoints (`/api/lobbies/:lobbyId/admin/orders`)

_Protected by `JwtAuthGuard` and `LobbyAdminGuard` (Admin-only access)._

#### 1. List All Lobby Member Orders

- **`GET /api/lobbies/:lobbyId/admin/orders`**
- **Access**: Lobby Admin Only (Returns `403 Forbidden` for regular members).
- **Behavior**: Lists all `OrderItem` records across all members in the lobby, including member display names and grand subtotal.

#### 2. Get Aggregated Restaurant Order Summary

- **`GET /api/lobbies/:lobbyId/admin/orders/summary`**
- **Access**: Lobby Admin Only.
- **Behavior**: Combines duplicate menu items ordered across all lobby members into single aggregated lines for easy ordering over the phone with the restaurant.
- **Sample Response**:
  ```json
  {
    "lobbyId": "22222222-2222-4222-8222-222222222222",
    "totalItemsCount": 6,
    "grandTotal": "60.00",
    "items": [
      {
        "menuItemId": "55555555-5555-4555-8555-555555555555",
        "name": "فول",
        "category": "أطباق",
        "totalQty": 6,
        "unitPrice": "10.00",
        "totalPrice": "60.00"
      }
    ]
  }
  ```
  _(Example: User A orders qty 4 + User B orders qty 2 -> returns `totalQty: 6`, `totalPrice: "60.00"`)_.

#### 3. Lobby-Wide Menu Item Price Override

- **`PATCH /api/lobbies/:lobbyId/admin/orders/menu-items/:menuItemId/price`**
- **Access**: Lobby Admin Only (Allowed in `open` or `locked` lobby state).
- **Body**:
  ```json
  {
    "actualPrice": "35.00"
  }
  ```
- **Behavior**:
  - Bulk updates `actualPrice` across **all existing member orders** containing `menuItemId` in that lobby.
  - Ensures any user adding `menuItemId` to their order in this lobby later will automatically use the updated price ("35.00").
- **Sample Response**:
  ```json
  {
    "lobbyId": "22222222-2222-4222-8222-222222222222",
    "menuItemId": "55555555-5555-4555-8555-555555555555",
    "updatedCount": 3,
    "newPrice": "35.00"
  }
  ```

---

## 4. Key Business Logic Rules

1. **Lobby Lifecycle Restrictions**:
   - Order creation (`addItem`), modification (`updateItem`), and deletion (`removeItem`) are only permitted when `lobby.status === 'open'`.
   - Admin price overrides (`overridePrice`) are allowed in `open` and `locked` states.
2. **Price Controls**:
   - Regular members can only specify `menuItemId` and `qty` when ordering. Members cannot specify or alter prices.
   - Prices default to `menuItem.referencePrice` or inherit lobby price overrides set by the admin.
3. **Lobby-Wide Price Inheritance**:
   - When a price is overridden by the admin, all existing cart lines in the lobby update to the new price immediately.
   - New items added by any user inherit the overridden price automatically.
4. **Admin Privileges**:
   - Only members with `role === 'admin'` can access `/admin/orders`, view all member carts, fetch aggregated summaries, or override prices.

---

## 5. Development & Testing Commands

### Running Unit Tests

Run Jest tests for the orders feature via Nx:

```bash
npm exec nx test backend -- --testPathPatterns=src/orders
```

### Building the Backend

Compile TypeScript and bundle the backend application:

```bash
npm exec nx build backend
```

### Running Local Dev Server

Start the development server with live reload:

```bash
npm run start:dev
```
