import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { queryKeys } from '../../../api/queryKeys';
import { billApi } from '../../../api/endpoints/bill';
import { paymentsApi } from '../../../api/endpoints/payments';
import type {
  ClaimPaymentPayload,
  PaymentBoard,
  ResolveClaimPayload,
} from '../../../api/endpoints/payments';
import { getApiError } from '../../../api/client';

/**
 * No websocket push yet (see queryKeys.ts) — short polling stands in. The
 * payment phase leans on this harder than the other screens do: the product
 * relies on everyone watching everyone else's status move, so a stale board
 * defeats the entire collection mechanism.
 */
const PAYMENTS_POLL_MS = 4000;

// ── Queries ──────────────────────────────────────────────────────────────────

/** Balances, InstaPay handle and every member's payment status. */
export function usePaymentBoard(
  lobbyCode: string,
  lobbyId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.lobbyPayments(lobbyCode),
    queryFn: () => paymentsApi.getBoard(lobbyId as string),
    enabled: !!lobbyId,
    // A settled lobby is frozen — nothing can change again, so the receipt
    // screen stops polling instead of asking forever.
    refetchInterval: (query) =>
      query.state.data?.status === 'settled' ? false : PAYMENTS_POLL_MS,
  });
}

/**
 * The finalised bill, for the per-member items/fees split. Static once the
 * host has finalised — only payment *statuses* move after that — so it does
 * not poll alongside the board.
 */
export function useFinalisedBill(
  lobbyCode: string,
  lobbyId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.lobbyBill(lobbyCode),
    queryFn: () => billApi.get(lobbyId as string),
    enabled: !!lobbyId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────
// Every payments mutation answers with the whole refreshed board, so each one
// seeds the cache from its own response. That makes the roster update in the
// same frame as the tap instead of waiting for the next poll. No optimistic
// patching here on purpose: a payment status is exactly the kind of claim that
// must not appear true before the server has agreed to it.

function useApplyBoard(lobbyCode: string) {
  const queryClient = useQueryClient();
  return (board: PaymentBoard) => {
    queryClient.setQueryData(queryKeys.lobbyPayments(lobbyCode), board);
    // The lobby's own status flips to `settled` on settle, and the lobby
    // query drives navigation guards elsewhere.
    void queryClient.invalidateQueries({
      queryKey: queryKeys.lobby(lobbyCode),
    });
  };
}

/**
 * Claims that *you* have paid. Takes no member id — see `paymentsApi.claim`;
 * the backend derives the claimant from the token, so this hook structurally
 * cannot be pointed at somebody else.
 */
export function useClaimPayment(lobbyCode: string, lobbyId: string) {
  const applyBoard = useApplyBoard(lobbyCode);
  return useMutation<PaymentBoard, unknown, ClaimPaymentPayload>({
    // A fresh key per attempt: retrying after a rejected claim must open a new
    // claim rather than replaying the old outcome.
    mutationFn: (payload) =>
      paymentsApi.claim(lobbyId, payload, Crypto.randomUUID()),
    onSuccess: applyBoard,
  });
}

/** Host only — accept a member's claim. */
export function useConfirmPayment(lobbyCode: string, lobbyId: string) {
  const applyBoard = useApplyBoard(lobbyCode);
  return useMutation<
    PaymentBoard,
    unknown,
    { memberId: string; payload?: ResolveClaimPayload }
  >({
    mutationFn: ({ memberId, payload }) =>
      paymentsApi.confirm(lobbyId, memberId, payload ?? {}),
    onSuccess: applyBoard,
  });
}

/** Host only — send a mistaken claim back to unpaid. */
export function useRejectPayment(lobbyCode: string, lobbyId: string) {
  const applyBoard = useApplyBoard(lobbyCode);
  return useMutation<
    PaymentBoard,
    unknown,
    { memberId: string; payload?: ResolveClaimPayload }
  >({
    mutationFn: ({ memberId, payload }) =>
      paymentsApi.reject(lobbyId, memberId, payload ?? {}),
    onSuccess: applyBoard,
  });
}

/** Host only — close the lobby out. */
export function useSettleLobby(lobbyCode: string, lobbyId: string) {
  const applyBoard = useApplyBoard(lobbyCode);
  return useMutation<PaymentBoard, unknown, void>({
    mutationFn: () => paymentsApi.settle(lobbyId),
    onSuccess: applyBoard,
  });
}

/**
 * Pulls the holdout names off a failed settle. The backend already knows who
 * is blocking and says so in `details.waitingOn`; naming them is the whole
 * enforcement mechanism, so the UI never falls back to a bare count.
 */
export function settlementHoldouts(error: unknown): string[] {
  const { code, details } = getApiError(error);
  if (code !== 'SETTLEMENT_INCOMPLETE') {
    return [];
  }
  const waitingOn = (details as { waitingOn?: unknown } | undefined)?.waitingOn;
  return Array.isArray(waitingOn)
    ? waitingOn.filter((name): name is string => typeof name === 'string')
    : [];
}
