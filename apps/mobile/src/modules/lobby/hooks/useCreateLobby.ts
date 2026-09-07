import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  lobbiesApi,
  type CreateLobbyPayload,
} from '../../../api/endpoints/lobbies';
import { queryKeys } from '../../../api/queryKeys';

export function useCreateLobby() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateLobbyPayload) => lobbiesApi.create(payload),
    onSuccess: (lobby) => {
      queryClient.setQueryData(queryKeys.lobby(lobby.code), lobby);
    },
  });
}
