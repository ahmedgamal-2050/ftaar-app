import { apiClient } from '../client';

// ── Types ────────────────────────────────────────────────────────────────────
// Mirrors apps/backend/src/orders/entities/order-item.entity.ts#toResponse()
// and apps/backend/src/orders/orders.service.ts's return shapes.

export interface OrderItemMenuItemSummary {
  id: string;
  name: string;
  category: string;
}

export interface OrderItemMemberSummary {
  id: string;
  displayName: string;
}

export interface OrderItem {
  id: string;
  lobbyId: string;
  lobbyMemberId: string;
  menuItemId: string;
  restaurantId: string;
  qty: number;
  /** EGP string e.g. "25.00" */
  actualPrice: string;
  /** EGP string e.g. "50.00" — actualPrice * qty */
  lineTotal: string;
  createdAt: string;
  menuItem?: OrderItemMenuItemSummary;
  /** Only present on admin listForLobby responses. */
  lobbyMember?: OrderItemMemberSummary;
}

export interface MemberOrderSummary {
  items: OrderItem[];
  subtotal: string;
}

export interface LobbyOrdersSummary {
  lobbyId: string;
  items: OrderItem[];
  subtotal: string;
}

export interface AggregatedOrderItem {
  menuItemId: string;
  name: string;
  category: string;
  totalQty: number;
  unitPrice: string;
  totalPrice: string;
}

export interface AggregatedOrderSummary {
  lobbyId: string;
  totalItemsCount: number;
  grandTotal: string;
  items: AggregatedOrderItem[];
}

export interface AddOrderItemPayload {
  menuItemId: string;
  qty: number;
}

export interface UpdateOrderItemPayload {
  qty: number;
}

// ── API client ───────────────────────────────────────────────────────────────
// See apps/backend/src/orders/README.md for the full contract.

export const ordersApi = {
  /** Add (or increment) an item in the current member's order — open lobbies only. */
  addItem: (lobbyId: string, payload: AddOrderItemPayload) =>
    apiClient
      .post<MemberOrderSummary>(`/lobbies/${lobbyId}/orders/items`, payload)
      .then((r) => r.data),

  /** Set the exact quantity of an item the current member owns. */
  updateItem: (
    lobbyId: string,
    itemId: string,
    payload: UpdateOrderItemPayload,
  ) =>
    apiClient
      .patch<MemberOrderSummary>(
        `/lobbies/${lobbyId}/orders/items/${itemId}`,
        payload,
      )
      .then((r) => r.data),

  /** Remove an item the current member owns. */
  removeItem: (lobbyId: string, itemId: string) =>
    apiClient
      .delete<MemberOrderSummary>(`/lobbies/${lobbyId}/orders/items/${itemId}`)
      .then((r) => r.data),

  /** The current member's own order items and subtotal. */
  findMine: (lobbyId: string) =>
    apiClient
      .get<MemberOrderSummary>(`/lobbies/${lobbyId}/orders/items`)
      .then((r) => r.data),

  /** Admin only — every order item in the lobby, across all members. */
  listForLobby: (lobbyId: string) =>
    apiClient
      .get<LobbyOrdersSummary>(`/lobbies/${lobbyId}/admin/orders`)
      .then((r) => r.data),

  /** Admin only — items merged by menu item, for reading aloud to the restaurant. */
  getSummary: (lobbyId: string) =>
    apiClient
      .get<AggregatedOrderSummary>(`/lobbies/${lobbyId}/admin/orders/summary`)
      .then((r) => r.data),
};
