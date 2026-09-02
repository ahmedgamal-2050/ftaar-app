# Mobile ordering flow (frontend)

Status: **done** in `apps/mobile`, wired against the real `apps/backend` orders/lobbies/menu APIs (`apps/backend/src/orders/*`, `apps/backend/src/lobbies/*`, `apps/backend/src/menu/*`). Every screen below makes real network calls — nothing is a local-only placeholder.

Covers two stories: **Ordering from the menu** (browse → cart → group visibility, with per-member edit permissions enforced) and **Reading the order to the restaurant** (a host-only merged summary for phoning it in).

## Screens

| Screen        | Route                              | Who sees what                                                                        | Backend call(s)                                                   |
| ------------- | ---------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Menu          | `LobbyRoomTabParamList.Menu`       | Everyone — the lobby's own restaurant menu, with a qty stepper per item              | `GET /restaurants/:id/menu`, `POST/PATCH/DELETE .../orders/items` |
| My Cart       | `LobbyRoomTabParamList.MyCart`     | Everyone — only their own order lines, editable while the lobby is `open`            | `GET .../orders/items`, `PATCH/DELETE .../orders/items/:id`       |
| Group         | `LobbyRoomTabParamList.Group`      | **Admin**: live per-member breakdown. **Member**: roster + their own cart total only | `GET .../admin/orders` (admin only), lobby member roster          |
| Order Summary | `LobbyStackParamList.OrderSummary` | **Admin only** — merged-by-item list for reading aloud to the restaurant             | `GET .../admin/orders/summary` (admin only)                       |

`Menu` / `MyCart` / `Group` are sub-tabs of `LobbyRoomScreen`, not top-level destinations — see `docs/backend-lobbies.md` for the lobby lifecycle they sit inside. `OrderSummary` is one level up, in `LobbyStack`, reached from the Group tab's "Read the order to the restaurant" button (admin only).

## How to run

```sh
npx nx run backend:serve   # API on :3000 (or override PORT — see apps/backend/.env)
npx nx run mobile:start    # Expo dev server
```

Same `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_SOCKET_URL` env vars as the auth flow — see `docs/mobile-auth.md#how-to-run`. Ordering has no additional env requirements.

## Layout

```
apps/mobile/src/
  api/
    endpoints/lobbies.ts        # lobbiesApi.getByCode / getById — Lobby, LobbyMember types
    endpoints/orders.ts         # ordersApi.{addItem,updateItem,removeItem,findMine,listForLobby,getSummary}
  modules/
    lobby/hooks/useLobby.ts     # useLobbyByCode (polls), useCurrentMember (derives role from the roster)
    lobby-room/
      hooks/useOrders.ts        # useMyOrder / useLobbyOrders / useOrderSummary (queries) +
                                 # useAddOrderItem / useUpdateOrderItem / useRemoveOrderItem (optimistic mutations)
      components/
        QuantityStepper.tsx     # "+ Add" pill <-> [- qty +] stepper, shared by Menu and My Cart
        LockedNotice.tsx        # persistent banner explaining *why* a locked lobby is read-only
      screens/
        MenuTabScreen.tsx
        MyCartTabScreen.tsx
        GroupTabScreen.tsx
    billing/screens/OrderSummaryScreen.tsx
  navigation/
    LobbyStack.tsx               # registers OrderSummary alongside LobbyRoom
```

## Backend contract — what the API actually returns

- **Prices are server-controlled.** `AddOrderItemDto` only accepts `menuItemId` and `qty` — a member can never set or alter a price. The backend defaults to the menu item's `referencePrice`, or an admin's lobby-wide override if one exists (`orders.service.ts#addItem`). The frontend never sends a price anywhere.
- **`POST .../orders/items` increments, it doesn't set.** Re-adding an item already in the cart adds to its quantity server-side. To decrement, the client must `PATCH` the item's own id with an explicit new `qty`, or `DELETE` it at `qty === 1`. `MenuTabScreen`/`MyCartTabScreen` both do this via `QuantityStepper`'s `onDecrement`.
- **Only `open` lobbies accept order writes.** `addItem`/`updateItem`/`removeItem` all 409 outside `status === 'open'`. The frontend treats every non-`open` status as "closed for ordering" and swaps edit controls for `LockedNotice` rather than disabling buttons silently (see [Locked-lobby UX](#locked-lobby-ux) below).
- **The full lobby order is admin-only.** `GET .../admin/orders` and `.../admin/orders/summary` are both behind `LobbyAdminGuard` — a regular member's token gets `403 FORBIDDEN`. A member's own `GET .../orders/items` only ever returns _their_ items. This is a real, load-bearing constraint on the Group tab's design — see below.
- **Ownership is enforced server-side, not just hidden client-side.** `updateItem`/`removeItem` resolve the caller's own `lobbyMember` row from the JWT and scope every `WHERE` clause to it (`orders.service.ts`). The frontend never even has another member's item id to send — `MyCartTabScreen` only ever renders the caller's own `GET .../orders/items` response — but the "done" criterion ("verified directly, not just hidden in the interface") holds regardless of what the UI shows.

## Design decisions forced by the real backend

### Group tab visibility is capped by what the backend actually exposes

The story asks for "everyone sees the whole group's order building in real time," but the backend only lets the lobby **admin** call `GET .../admin/orders` — there is no member-facing "see everyone's cart" endpoint. Rather than route around that (there's no client-side way to fake it, and doing so would defeat the ownership guard's entire point), the Group tab branches on role:

- **Admin**: `useLobbyOrders` (`GET .../admin/orders`) grouped by `lobbyMemberId`, rendered as one card per lobby member — name, "Host" badge, item preview, running subtotal — plus the button into `OrderSummary`.
- **Member**: roster only (avatar, name, role badge) from the lobby's own member list (already returned by `GET /lobbies/code/:code`), plus the member's own cart total via `useMyOrder`. A banner explains "Only the host can see everyone's order right now."

This was confirmed with the user as the intended tradeoff rather than assumed — see the "Roster-only for members" decision. If a member-facing endpoint is added later, only `GroupTabScreen`'s member branch needs to change.

### No websocket — polling stands in for "real time"

`queryKeys.ts` documents an intent for a websocket to invalidate these queries directly; no gateway exists yet on the backend. `useLobbyByCode`, `useMyOrder`, `useLobbyOrders`, and `useOrderSummary` all set `refetchInterval: 4000` so the Menu/Cart/Group tabs and the lobby's `status` (e.g. the host locking the cart) update within a few seconds without a manual pull-to-refresh. Swap-in point for later: replace the interval with a websocket-driven `queryClient.invalidateQueries` call using the same `queryKeys`.

### Optimistic updates, reconciled against server truth

`useAddOrderItem`/`useUpdateOrderItem`/`useRemoveOrderItem` (`lobby-room/hooks/useOrders.ts`) patch the `lobbyMyOrders` cache in `onMutate` so a tap shows up immediately — the story explicitly calls for this ("It feels instant"). A freshly-added item gets a synthetic `optimistic-<menuItemId>` id until the mutation settles; `MenuRow`/`CartRow` disable further taps on that specific row while the id is still synthetic (checked via `.id.startsWith('optimistic-')`) so a rapid decrement can't target an id the server has never heard of. On error, the previous cache snapshot is restored; on settle, `mine`/`admin orders`/`summary` queries are all invalidated to reconcile with the server (real id, real price — which may differ from the optimistic guess if an admin had already overridden it).

### Locked-lobby UX

Once `lobby.status !== 'open'`, `MenuTabScreen` and `MyCartTabScreen` both render `LockedNotice` — a persistent banner naming the specific reason (locked / billed / settled / cancelled) — instead of the qty stepper or remove button. This was a deliberate acceptance criterion ("every control explains why rather than just disabling silently"), not just a disabled-button treatment.

## Test coverage

`npx nx run mobile:test` — 100 tests across 27 suites; 95 passing. The 5 failures are **pre-existing and unrelated** to ordering (`RestaurantListScreen.spec.tsx`, `MainTabs.spec.tsx` — both missing a `QueryClientProvider` wrapper in their own test setup, not something this work touched; previously masked by an unrelated dependency-version bug that has since been fixed).

Ordering-specific coverage lives in `apps/mobile/src/navigation/LobbyStack.spec.tsx`, rewritten from placeholder-only assertions to mock the lobbies/menu/orders API modules and exercise real rendering:

- Menu tab loads the lobby's own restaurant name and menu items from a mocked `lobbiesApi.getByCode` / `menuApi.list`.
- The host sees the merged order summary (`getSummary` mocked with two aggregated items, asserting both a per-item total and a distinct grand total render).
- A regular member hitting `OrderSummary` directly sees the "Host only" notice, and `getSummary` is never called for them (`toHaveBeenCalled()` assertion) — i.e. the admin gate is enforced in the component tree, not just visually hidden.
- The still-placeholder routes (`LobbyShare`, `BillEntry`, `BillReview`, `PaymentBoard`, `LobbySettled`) keep their original placeholder assertions.

## Known gaps

- **No per-item notes.** The story's "Reading the order to the restaurant" acceptance criteria call for showing notes from multiple members on the same item. `OrderItem` has no note field in the Prisma schema or `AddOrderItemDto`/`toResponse()` — there is nothing for the frontend to display. Needs a backend schema change (a `note` column on `order_items`, threaded through add/update DTOs and both the member and admin response shapes) before this can be built.
- **Group tab's live view is admin-only**, as described above — a member-facing "everyone's cart" endpoint would let the Group tab show the full breakdown to everyone, matching the story's letter rather than the roster-only compromise.
- **Polling, not push.** Menu/Cart/Group/status updates lag by up to ~4s (the `refetchInterval`) rather than being instant — acceptable for a small group ordering breakfast, but a real websocket gateway would remove the lag entirely.
