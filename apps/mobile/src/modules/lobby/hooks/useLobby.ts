import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../api/queryKeys';
import { lobbiesApi } from '../../../api/endpoints/lobbies';
import type { Lobby, LobbyMember } from '../../../api/endpoints/lobbies';
import { useAuth } from '../../../auth/AuthContext';

/** No websocket push yet (see queryKeys.ts) — short polling stands in for
 * "real time" while the lobby room is on screen. */
const LOBBY_POLL_MS = 4000;

/** Fetches the lobby (with its member roster) by share code. Polls while
 * mounted so status changes (e.g. the host locking the cart) show up without
 * a manual refresh. */
export function useLobbyByCode(lobbyCode: string) {
  return useQuery({
    queryKey: queryKeys.lobby(lobbyCode),
    queryFn: () => lobbiesApi.getByCode(lobbyCode),
    enabled: !!lobbyCode,
    refetchInterval: LOBBY_POLL_MS,
  });
}

/** The signed-in user's own membership row within a lobby, or null if the
 * roster hasn't loaded yet (or somehow doesn't include them). */
export function useCurrentMember(lobby: Lobby | undefined): LobbyMember | null {
  const { user } = useAuth();
  if (!lobby || !user) {
    return null;
  }
  return lobby.members.find((m) => m.userId === user.id) ?? null;
}
