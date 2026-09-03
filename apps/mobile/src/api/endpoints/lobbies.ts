import { apiClient } from '../client';

// ── Types ────────────────────────────────────────────────────────────────────
// Mirrors LobbyResponseDto — see apps/backend/src/lobbies/dto/lobby-response.dto.ts

export type LobbyStatus =
  | 'open'
  | 'locked'
  | 'billed'
  | 'settled'
  | 'cancelled';
export type MemberRole = 'admin' | 'member';

export interface LobbyMember {
  id: string;
  lobbyId: string;
  userId: string;
  role: MemberRole;
  displayName: string;
  createdAt: string;
}

export interface LobbyRestaurantSummary {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Lobby {
  id: string;
  restaurantId: string;
  code: string;
  status: LobbyStatus;
  maxMembers: number | null;
  expiresAt: string | null;
  instaPayHandle: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  restaurant?: LobbyRestaurantSummary;
  members: LobbyMember[];
}

// ── API client ───────────────────────────────────────────────────────────────

export const lobbiesApi = {
  /** Get lobby details (incl. members and restaurant) by its 6-char share code. */
  getByCode: (code: string) =>
    apiClient.get<Lobby>(`/lobbies/code/${code}`).then((r) => r.data),

  /** Get lobby details by id. */
  getById: (id: string) =>
    apiClient.get<Lobby>(`/lobbies/${id}`).then((r) => r.data),
};
