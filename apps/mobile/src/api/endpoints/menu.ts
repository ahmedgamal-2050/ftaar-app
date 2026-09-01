import { apiClient } from '../client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  /** Empty string means uncategorized */
  category: string;
  /** EGP string e.g. "25.00" — serialised by Money.toJSON() */
  referencePrice: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMenuItemPayload {
  name: string;
  /** Optional — defaults to '' (uncategorized) */
  category?: string;
  /** EGP string e.g. "25.00" */
  referencePrice: string;
}

export interface UpdateMenuItemPayload {
  name?: string;
  category?: string;
  referencePrice?: string;
  isActive?: boolean;
}

export interface BulkMenuItemPayload {
  name: string;
  category?: string;
  referencePrice: string;
}

// ── API client ───────────────────────────────────────────────────────────────

export const menuApi = {
  /** List a restaurant's menu items.
   *  Pass includeInactive=true for the management view (registered users). */
  list: (restaurantId: string, includeInactive = false) =>
    apiClient
      .get<MenuItem[]>(`/restaurants/${restaurantId}/menu`, {
        params: includeInactive ? { includeInactive: 'true' } : undefined,
      })
      .then((r) => r.data),

  /** Add a single item — POST /restaurants/:id/menu */
  create: (restaurantId: string, payload: CreateMenuItemPayload) =>
    apiClient
      .post<MenuItem>(`/restaurants/${restaurantId}/menu`, payload)
      .then((r) => r.data),

  /** Edit an item — PATCH /menu-items/:id */
  update: (itemId: string, payload: UpdateMenuItemPayload) =>
    apiClient
      .patch<MenuItem>(`/menu-items/${itemId}`, payload)
      .then((r) => r.data),

  /** Retire an item (soft-delete via isActive=false) — PATCH /menu-items/:id */
  retire: (itemId: string) =>
    apiClient
      .patch<MenuItem>(`/menu-items/${itemId}`, { isActive: false })
      .then((r) => r.data),

  /** Bulk-create up to 200 items — POST /restaurants/:id/menu/bulk */
  bulk: (restaurantId: string, items: BulkMenuItemPayload[]) =>
    apiClient
      .post<MenuItem[]>(`/restaurants/${restaurantId}/menu/bulk`, { items })
      .then((r) => r.data),
};
