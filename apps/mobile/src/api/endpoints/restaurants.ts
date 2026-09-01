import { apiClient } from '../client';

export interface Restaurant {
  id: string;
  name: string;
  phone: string;
  image: string;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantListResponse {
  items: Restaurant[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateRestaurantPayload {
  name: string;
  /** Required by backend — min 5, max 32 chars. */
  phone: string;
  /** Required by backend — URL string. Send empty string '' when no image chosen yet. */
  image: string;
  /** Optional free-text note. */
  note?: string;
}

/** Typed client for the backend's `/restaurants` endpoints — see
 * apps/backend/src/restaurants/restaurants.controller.ts for the source of truth. */
export const restaurantsApi = {
  /** List active restaurants. Search is case-insensitive (including Arabic). */
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient
      .get<RestaurantListResponse>('/restaurants', { params })
      .then((res) => res.data),

  /** Create a restaurant. Requires a registered user (backend enforces via RegisteredUserGuard). */
  create: (payload: CreateRestaurantPayload) =>
    apiClient.post<Restaurant>('/restaurants', payload).then((res) => res.data),
};
