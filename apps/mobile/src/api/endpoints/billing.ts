import { apiClient } from '../client';
import type { MemberRole } from './lobbies';

// ── Types ────────────────────────────────────────────────────────────────────
// Mirrors apps/backend/src/billing/* — see docs/backend-billing.md. Every money
// field crosses the wire as an EGP string ("36.87"): the backend's response
// interceptor runs `serializeMoney` over the whole body before wrapping it.

export type BillPaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed';

export interface BillDraftMember {
  id: string;
  userId: string;
  displayName: string;
  role: MemberRole;
  paymentStatus: BillPaymentStatus;
}

/**
 * One member's order of a single menu item. `actualPrice` is the price for
 * the whole line, not per unit — the backend sums it as-is (`bill-math.ts`'s
 * `memberSubtotals`), and `suggestedActual` is `referencePrice × qty`.
 */
export interface BillDraftLine {
  id: string;
  memberId: string;
  qty: number;
  /** null until the host enters a price. */
  actualPrice: string | null;
  delivered: boolean;
  suggestedActual: string;
}

export interface BillDraftGroup {
  menuItemId: string;
  name: string;
  /** The menu's per-unit price, for the "Ref:" comparison. */
  referencePrice: string;
  lines: BillDraftLine[];
}

export interface BillDraft {
  lobbyId: string;
  /** Always the arrived status (`locked`) — draft is rejected otherwise. */
  status: string;
  members: BillDraftMember[];
  groups: BillDraftGroup[];
}

export interface BillPatchLine {
  id: string;
  /** Omit to leave unchanged; null clears the price. */
  actualPrice?: string | null;
  delivered?: boolean;
}

export interface PatchBillLinesPayload {
  lines: BillPatchLine[];
  /** Copies each price onto every line sharing that `menuItemId`. */
  applyToAllMatching?: boolean;
}

/** The host-entered charges. Sent to both preview and finalise. */
export interface BillFees {
  deliveryFee: string;
  serviceFee: string;
  discount: string;
  /** What the paper receipt says, for reconciliation. Optional. */
  receiptTotal?: string | null;
}

export interface BillReconciliation {
  receiptTotal: string | null;
  computedTotal: string;
  difference: string | null;
  /** True when the receipt and the computed total disagree. Never blocks. */
  warns: boolean;
}

export interface BillMemberBalance {
  id: string;
  userId: string;
  displayName: string;
  role: MemberRole;
  itemsSubtotal: string;
  feesShare: string;
  total: string;
  paymentStatus: BillPaymentStatus;
}

export interface BillAllocation {
  id: string;
  subtotal: string;
  feesShare: string;
  total: string;
}

/** `buildInvariant`'s output — shared by preview, finalise and GET /bill. */
export interface BillInvariant {
  subtotal: string;
  deliveryFee: string;
  serviceFee: string;
  discount: string;
  netFees: string;
  /** Mirrors `serviceFee` today (see docs/backend-billing.md). */
  tax: string;
  total: string;
  members: BillMemberBalance[];
  allocations: BillAllocation[];
  reconciliation: BillReconciliation;
}

export interface FinalisedBill extends BillInvariant {
  /** `billed` once finalise succeeds. */
  status: string;
}

export interface ReopenedBill {
  lobbyId: string;
  /** Back to the arrived status (`locked`). */
  status: string;
}

// ── API client ───────────────────────────────────────────────────────────────
// See docs/backend-billing.md for the full contract. Every route is admin-only
// except `getBill`, and every one but `reopen`/`getBill` needs the lobby to be
// in the arrived (`locked`) state.

export const billingApi = {
  /** Lines grouped by menu item, with the suggested price for each. */
  getDraft: (lobbyId: string) =>
    apiClient
      .get<BillDraft>(`/lobbies/${lobbyId}/bill/draft`)
      .then((r) => r.data),

  /** Batch-save prices and delivery flags; returns the refreshed draft. */
  patchLines: (lobbyId: string, payload: PatchBillLinesPayload) =>
    apiClient
      .patch<BillDraft>(`/lobbies/${lobbyId}/bill/lines`, payload)
      .then((r) => r.data),

  /** Totals, balances and reconciliation for a set of fees. Writes nothing. */
  preview: (lobbyId: string, fees: BillFees) =>
    apiClient
      .post<BillInvariant>(`/lobbies/${lobbyId}/bill/preview`, fees)
      .then((r) => r.data),

  /**
   * Publishes the bill and moves the lobby to `billed`. Repeating the same
   * `idempotencyKey` after success returns the existing bill rather than
   * erroring, so a retried tap is safe.
   */
  finalise: (lobbyId: string, fees: BillFees, idempotencyKey: string) =>
    apiClient
      .post<FinalisedBill>(`/lobbies/${lobbyId}/bill/finalise`, fees, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data),

  /** Back to arrived so the host can fix a mistake — before anyone pays. */
  reopen: (lobbyId: string) =>
    apiClient
      .post<ReopenedBill>(`/lobbies/${lobbyId}/bill/reopen`)
      .then((r) => r.data),

  /** Any member — the finalised bill with everyone's totals. */
  getBill: (lobbyId: string) =>
    apiClient
      .get<FinalisedBill>(`/lobbies/${lobbyId}/bill`)
      .then((r) => r.data),
};
