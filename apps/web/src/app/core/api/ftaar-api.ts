import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  AuthSession,
  AuthUser,
  BillDraft,
  BillPreview,
  HealthPayload,
  JoinLobbyResult,
  KitchenSummary,
  Lobby,
  LobbyMember,
  LobbyOrdersSummary,
  MemberOrderSummary,
  MenuItem,
  MessageResponse,
  OverridePriceResult,
  Restaurant,
  RestaurantList,
} from './types';

@Injectable({ providedIn: 'root' })
export class FtaarApi {
  private readonly http = inject(HttpClient);

  hello() {
    return firstValueFrom(this.http.get<{ message: string }>('/api'));
  }

  health() {
    return firstValueFrom(this.http.get<HealthPayload>('/health'));
  }

  healthDb() {
    return firstValueFrom(this.http.get<HealthPayload>('/health/db'));
  }

  guest() {
    return firstValueFrom(this.http.post<AuthSession>('/api/auth/guest', {}));
  }

  register(email: string, password: string) {
    return firstValueFrom(
      this.http.post<{ verificationRequired: boolean; email: string }>(
        '/api/auth/register',
        { email, password },
      ),
    );
  }

  verifyRegistrationOtp(email: string, otp: string) {
    return firstValueFrom(
      this.http.post<AuthSession>('/api/auth/register/verify-otp', {
        email,
        otp,
      }),
    );
  }

  resendRegistrationOtp(email: string) {
    return firstValueFrom(
      this.http.post<MessageResponse>('/api/auth/register/resend-otp', {
        email,
      }),
    );
  }

  convert(email: string, password: string) {
    return firstValueFrom(
      this.http.post<AuthSession>('/api/auth/convert', { email, password }),
    );
  }

  login(email: string, password: string) {
    return firstValueFrom(
      this.http.post<AuthSession>('/api/auth/login', { email, password }),
    );
  }

  refresh(refreshToken: string) {
    return firstValueFrom(
      this.http.post<AuthSession>('/api/auth/refresh', { refreshToken }),
    );
  }

  logout(refreshToken: string) {
    return firstValueFrom(
      this.http.post<void>('/api/auth/logout', { refreshToken }),
    );
  }

  forgotPassword(email: string) {
    return firstValueFrom(
      this.http.post<MessageResponse>('/api/auth/forgot-password', { email }),
    );
  }

  verifyForgotPasswordOtp(email: string, otp: string) {
    return firstValueFrom(
      this.http.post<{ resetToken: string }>(
        '/api/auth/forgot-password/verify-otp',
        { email, otp },
      ),
    );
  }

  resetPassword(resetToken: string, newPassword: string) {
    return firstValueFrom(
      this.http.post<MessageResponse>('/api/auth/reset-password', {
        resetToken,
        newPassword,
      }),
    );
  }

  me() {
    return firstValueFrom(this.http.get<AuthUser>('/api/auth/me'));
  }

  updateMe(payload: { displayName?: string; instaPayHandle?: string }) {
    return firstValueFrom(this.http.patch<AuthUser>('/api/auth/me', payload));
  }

  listRestaurants(query: {
    search?: string;
    page?: number;
    limit?: number;
    includeInactive?: boolean;
  }) {
    let params = new HttpParams();
    if (query.search) {
      params = params.set('search', query.search);
    }
    if (query.page) {
      params = params.set('page', String(query.page));
    }
    if (query.limit) {
      params = params.set('limit', String(query.limit));
    }
    if (query.includeInactive) {
      params = params.set('includeInactive', 'true');
    }
    return firstValueFrom(
      this.http.get<RestaurantList>('/api/restaurants', { params }),
    );
  }

  createRestaurant(payload: {
    name: string;
    phone: string;
    image: string;
    note?: string;
  }) {
    return firstValueFrom(
      this.http.post<Restaurant>('/api/restaurants', payload),
    );
  }

  getRestaurant(id: string, includeInactive = false) {
    let params = new HttpParams();
    if (includeInactive) {
      params = params.set('includeInactive', 'true');
    }
    return firstValueFrom(
      this.http.get<Restaurant>(`/api/restaurants/${id}`, { params }),
    );
  }

  updateRestaurant(
    id: string,
    payload: {
      name?: string;
      phone?: string;
      image?: string;
      note?: string | null;
      isActive?: boolean;
    },
  ) {
    return firstValueFrom(
      this.http.patch<Restaurant>(`/api/restaurants/${id}`, payload),
    );
  }

  deleteRestaurant(id: string) {
    return firstValueFrom(
      this.http.delete<Restaurant>(`/api/restaurants/${id}`),
    );
  }

  listMenu(restaurantId: string, includeInactive = false) {
    let params = new HttpParams();
    if (includeInactive) {
      params = params.set('includeInactive', 'true');
    }
    return firstValueFrom(
      this.http.get<MenuItem[]>(`/api/restaurants/${restaurantId}/menu`, {
        params,
      }),
    );
  }

  createMenuItem(
    restaurantId: string,
    payload: {
      name: string;
      category?: string;
      referencePrice: string;
      isActive?: boolean;
    },
  ) {
    return firstValueFrom(
      this.http.post<MenuItem>(
        `/api/restaurants/${restaurantId}/menu`,
        payload,
      ),
    );
  }

  bulkMenu(
    restaurantId: string,
    items: Array<{
      name: string;
      category?: string;
      referencePrice: string;
      isActive?: boolean;
    }>,
  ) {
    return firstValueFrom(
      this.http.post<MenuItem[]>(`/api/restaurants/${restaurantId}/menu/bulk`, {
        items,
      }),
    );
  }

  updateMenuItem(
    id: string,
    payload: {
      name?: string;
      category?: string;
      referencePrice?: string;
      isActive?: boolean;
    },
  ) {
    return firstValueFrom(
      this.http.patch<MenuItem>(`/api/menu-items/${id}`, payload),
    );
  }

  deleteMenuItem(id: string, force = false) {
    let params = new HttpParams();
    if (force) {
      params = params.set('force', 'true');
    }
    return firstValueFrom(
      this.http.delete<MenuItem>(`/api/menu-items/${id}`, { params }),
    );
  }

  createLobby(payload: {
    restaurantId: string;
    maxMembers?: number;
    expiryMinutes?: number;
    expiresAt?: string;
    instaPayHandle?: string;
  }) {
    return firstValueFrom(this.http.post<Lobby>('/api/lobbies', payload));
  }

  joinLobby(code: string, displayName?: string) {
    return firstValueFrom(
      this.http.post<JoinLobbyResult>('/api/lobbies/join', {
        code,
        displayName: displayName || undefined,
      }),
    );
  }

  lobbyByCode(code: string) {
    return firstValueFrom(this.http.get<Lobby>(`/api/lobbies/code/${code}`));
  }

  getLobby(id: string) {
    return firstValueFrom(this.http.get<Lobby>(`/api/lobbies/${id}`));
  }

  lockLobby(id: string) {
    return firstValueFrom(
      this.http.patch<Lobby>(`/api/lobbies/${id}/lock`, {}),
    );
  }

  reopenLobby(id: string) {
    return firstValueFrom(
      this.http.patch<Lobby>(`/api/lobbies/${id}/reopen`, {}),
    );
  }

  removeMember(lobbyId: string, memberId: string) {
    return firstValueFrom(
      this.http.delete<LobbyMember>(
        `/api/lobbies/${lobbyId}/members/${memberId}`,
      ),
    );
  }

  leaveLobby(id: string) {
    return firstValueFrom(
      this.http.delete<LobbyMember>(`/api/lobbies/${id}/leave`),
    );
  }

  myOrder(lobbyId: string) {
    return firstValueFrom(
      this.http.get<MemberOrderSummary>(`/api/lobbies/${lobbyId}/orders/items`),
    );
  }

  addOrderItem(lobbyId: string, menuItemId: string, qty: number) {
    return firstValueFrom(
      this.http.post<MemberOrderSummary>(
        `/api/lobbies/${lobbyId}/orders/items`,
        { menuItemId, qty },
      ),
    );
  }

  updateOrderItem(lobbyId: string, itemId: string, qty: number) {
    return firstValueFrom(
      this.http.patch<MemberOrderSummary>(
        `/api/lobbies/${lobbyId}/orders/items/${itemId}`,
        { qty },
      ),
    );
  }

  removeOrderItem(lobbyId: string, itemId: string) {
    return firstValueFrom(
      this.http.delete<MemberOrderSummary>(
        `/api/lobbies/${lobbyId}/orders/items/${itemId}`,
      ),
    );
  }

  adminOrders(lobbyId: string) {
    return firstValueFrom(
      this.http.get<LobbyOrdersSummary>(`/api/lobbies/${lobbyId}/admin/orders`),
    );
  }

  kitchenSummary(lobbyId: string) {
    return firstValueFrom(
      this.http.get<KitchenSummary>(
        `/api/lobbies/${lobbyId}/admin/orders/summary`,
      ),
    );
  }

  overrideMenuItemPrice(
    lobbyId: string,
    menuItemId: string,
    actualPrice: string,
  ) {
    return firstValueFrom(
      this.http.patch<OverridePriceResult>(
        `/api/lobbies/${lobbyId}/admin/orders/menu-items/${menuItemId}/price`,
        { actualPrice },
      ),
    );
  }

  billDraft(lobbyId: string) {
    return firstValueFrom(
      this.http.get<BillDraft>(`/api/lobbies/${lobbyId}/bill/draft`),
    );
  }

  patchBillLines(
    lobbyId: string,
    payload: {
      lines: Array<{
        id: string;
        actualPrice?: string | null;
        delivered?: boolean;
      }>;
      applyToAllMatching?: boolean;
    },
  ) {
    return firstValueFrom(
      this.http.patch<BillDraft>(`/api/lobbies/${lobbyId}/bill/lines`, payload),
    );
  }

  previewBill(
    lobbyId: string,
    payload: {
      deliveryFee: string;
      serviceFee: string;
      discount: string;
      receiptTotal?: string;
    },
  ) {
    return firstValueFrom(
      this.http.post<BillPreview>(
        `/api/lobbies/${lobbyId}/bill/preview`,
        payload,
      ),
    );
  }

  finaliseBill(
    lobbyId: string,
    payload: {
      deliveryFee: string;
      serviceFee: string;
      discount: string;
      receiptTotal?: string;
      idempotencyKey?: string;
    },
    idempotencyKey?: string,
  ) {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return firstValueFrom(
      this.http.post<BillPreview>(
        `/api/lobbies/${lobbyId}/bill/finalise`,
        payload,
        { headers },
      ),
    );
  }

  reopenBill(lobbyId: string) {
    return firstValueFrom(
      this.http.post<{ lobbyId: string; status: string }>(
        `/api/lobbies/${lobbyId}/bill/reopen`,
        {},
      ),
    );
  }

  getBill(lobbyId: string) {
    return firstValueFrom(
      this.http.get<BillPreview>(`/api/lobbies/${lobbyId}/bill`),
    );
  }
}
