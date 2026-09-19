import { apiClient } from '../client';
import type { PaymentStatus } from './payments';

// ── Types ────────────────────────────────────────────────────────────────────
// Mirrors the `InvariantBlock` returned by
// apps/backend/src/billing/billing.service.ts#readFinalisedBill, with every
// `Money` serialised to an EGP string.

/**
 * One member's slice of the finalised bill. The payment board only carries
 * `total`; this is where the "what did I actually order vs. what am I chipping
 * in for fees" split comes from.
 */
export interface BillMemberShare {
  id: string;
  userId: string;
  displayName: string;
  role: 'admin' | 'member';
  /** EGP string — delivered items this member ordered. */
  itemsSubtotal: string;
  /** EGP string — their allocated slice of delivery/service minus discount. */
  feesShare: string;
  /** EGP string — `itemsSubtotal + feesShare`. */
  total: string;
  paymentStatus: PaymentStatus;
}

export interface BillReconciliation {
  receiptTotal: string | null;
  computedTotal: string;
  difference: string | null;
  /** True when the computed total disagrees with the receipt the host entered. */
  warns: boolean;
}

export interface FinalisedBill {
  /** EGP string — items across every member, before fees. */
  subtotal: string;
  deliveryFee: string;
  serviceFee: string;
  discount: string;
  /** EGP string — `deliveryFee + serviceFee - discount`. */
  netFees: string;
  total: string;
  members: BillMemberShare[];
  reconciliation: BillReconciliation;
  status: string;
}

// ── API client ───────────────────────────────────────────────────────────────

export const billApi = {
  /**
   * The member-visible bill. Readable by every member, not just the host —
   * the whole point is that each person can audit their own line before
   * paying, and see that the fee split was applied to everyone equally.
   */
  get: (lobbyId: string) =>
    apiClient
      .get<FinalisedBill>(`/lobbies/${lobbyId}/bill`)
      .then((r) => r.data),
};
