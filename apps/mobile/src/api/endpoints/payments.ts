import { apiClient } from '../client';

// ── Types ────────────────────────────────────────────────────────────────────
// Mirrors apps/backend/src/payments/dto/payment-board-response.dto.ts. Every
// `Money` field crosses the wire as an EGP string (e.g. "128.50") — see the
// backend's serializeMoney in core/http/response-wrap.interceptor.ts.

/** `failed` exists in the backend enum but no flow currently produces it. */
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed';

export type PaymentBoardStatus = 'billed' | 'settled';

/** The signed-in member's own row, lifted out so the pay CTA never has to
 * guess which of `members` is "me". */
export interface PaymentBoardYou {
  memberId: string;
  /** EGP string, e.g. "42.75". */
  amountOwed: string;
  paymentStatus: PaymentStatus;
  isAdmin: boolean;
}

export interface PaymentBoardMember {
  id: string;
  userId: string;
  displayName: string;
  role: 'admin' | 'member';
  /** EGP string — this member's share, items plus allocated fees. */
  total: string;
  paymentStatus: PaymentStatus;
  /** Non-null only while a claim is awaiting the host's decision. */
  pendingClaimId: string | null;
}

export interface PaymentBoard {
  lobbyId: string;
  status: PaymentBoardStatus;
  /** The host's InstaPay handle — the recipient every member pays. */
  instaPayHandle: string | null;
  /** EGP string — sum of every member already marked paid. */
  collected: string;
  grandTotal: string;
  you: PaymentBoardYou;
  members: PaymentBoardMember[];
  /**
   * Display names of everyone who still owes money. The backend derives this
   * itself and refuses to settle while it is non-empty, so the UI shows this
   * list rather than counting unpaid members client-side.
   */
  waitingOn: string[];
}

export interface ClaimPaymentPayload {
  /** Free-text reference shown to the host (transfer id, last digits, …). */
  note?: string;
}

export interface ResolveClaimPayload {
  note?: string;
}

// ── API client ───────────────────────────────────────────────────────────────
// Every mutation returns the full refreshed board, so callers can seed the
// cache from the response instead of firing a follow-up GET.

export const paymentsApi = {
  /** Balances, InstaPay handle and everyone's payment status. */
  getBoard: (lobbyId: string) =>
    apiClient
      .get<PaymentBoard>(`/lobbies/${lobbyId}/payments`)
      .then((r) => r.data),

  /**
   * Marks *the caller* as having paid. There is deliberately no member
   * parameter: the backend resolves the claimant from the bearer token, so
   * one member cannot claim on another's behalf.
   *
   * `idempotencyKey` guards the double-tap — the backend replays the first
   * outcome instead of opening a second claim. Mint a fresh key per attempt.
   */
  claim: (
    lobbyId: string,
    payload: ClaimPaymentPayload,
    idempotencyKey: string,
  ) =>
    apiClient
      .post<PaymentBoard>(`/lobbies/${lobbyId}/payments/claim`, payload, {
        headers: { 'idempotency-key': idempotencyKey },
      })
      .then((r) => r.data),

  /** Host only — accepts a member's claim once the money has arrived. */
  confirm: (
    lobbyId: string,
    memberId: string,
    payload: ResolveClaimPayload = {},
  ) =>
    apiClient
      .post<PaymentBoard>(
        `/lobbies/${lobbyId}/payments/members/${memberId}/confirm`,
        payload,
      )
      .then((r) => r.data),

  /** Host only — sends a mistaken claim back to unpaid, with an optional reason. */
  reject: (
    lobbyId: string,
    memberId: string,
    payload: ResolveClaimPayload = {},
  ) =>
    apiClient
      .post<PaymentBoard>(
        `/lobbies/${lobbyId}/payments/members/${memberId}/reject`,
        payload,
      )
      .then((r) => r.data),

  /**
   * Host only — closes the lobby. Rejects with `SETTLEMENT_INCOMPLETE` and a
   * `details.waitingOn` name list while anyone still owes.
   */
  settle: (lobbyId: string) =>
    apiClient
      .post<PaymentBoard>(`/lobbies/${lobbyId}/payments/settle`)
      .then((r) => r.data),
};
