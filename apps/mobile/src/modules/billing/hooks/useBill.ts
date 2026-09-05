import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../api/queryKeys';
import { billingApi } from '../../../api/endpoints/billing';
import type {
  BillDraft,
  BillFees,
  PatchBillLinesPayload,
} from '../../../api/endpoints/billing';

/**
 * Bill Entry is single-editor by design — only the lobby admin can open it,
 * and the lobby is locked while they do — so unlike the ordering screens
 * these queries don't poll. A stale draft here would fight the host's typing.
 */

export function useBillDraft(
  lobbyCode: string,
  lobbyId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.lobbyBillDraft(lobbyCode),
    queryFn: () => billingApi.getDraft(lobbyId as string),
    enabled: enabled && !!lobbyId,
  });
}

/**
 * Saves prices and delivery flags. The response *is* the refreshed draft, so
 * it seeds the cache directly rather than triggering a second round trip.
 */
export function usePatchBillLines(lobbyCode: string, lobbyId: string) {
  const queryClient = useQueryClient();

  return useMutation<BillDraft, unknown, PatchBillLinesPayload>({
    mutationFn: (payload) => billingApi.patchLines(lobbyId, payload),
    onSuccess: (draft) => {
      queryClient.setQueryData(queryKeys.lobbyBillDraft(lobbyCode), draft);
    },
  });
}

/** Totals and per-member balances for a set of fees. Writes nothing. */
export function useBillPreview(
  lobbyCode: string,
  lobbyId: string | undefined,
  fees: BillFees,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...queryKeys.lobbyBill(lobbyCode), 'preview', fees] as const,
    queryFn: () => billingApi.preview(lobbyId as string, fees),
    enabled: enabled && !!lobbyId,
  });
}

/** The published bill, rebuilt from the fees stored at finalise. */
export function useFinalisedBill(
  lobbyCode: string,
  lobbyId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.lobbyBill(lobbyCode),
    queryFn: () => billingApi.getBill(lobbyId as string),
    enabled: enabled && !!lobbyId,
  });
}

/**
 * Publishes the bill. The caller passes a key it generated once per attempt,
 * so a retried tap after a dropped response returns the bill that already
 * exists instead of a CONFLICT.
 */
export function useFinaliseBill(lobbyCode: string, lobbyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fees,
      idempotencyKey,
    }: {
      fees: BillFees;
      idempotencyKey: string;
    }) => billingApi.finalise(lobbyId, fees, idempotencyKey),
    onSuccess: () => {
      // The lobby's own status moves to `billed`, which every other screen
      // reads to close ordering.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lobby(lobbyCode),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lobbyBill(lobbyCode),
      });
    },
  });
}

/** Back to arrived so the host can correct a mistake — before anyone pays. */
export function useReopenBill(lobbyCode: string, lobbyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => billingApi.reopen(lobbyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lobby(lobbyCode),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lobbyBill(lobbyCode),
      });
    },
  });
}
