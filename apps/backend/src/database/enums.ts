export const LOBBY_STATUSES = [
  'open',
  'locked',
  'billed',
  'settled',
  'cancelled',
] as const;
export type LobbyStatus = (typeof LOBBY_STATUSES)[number];

export const MEMBER_ROLES = ['admin', 'member'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const PAYMENT_STATUSES = [
  'unpaid',
  'pending',
  'paid',
  'failed',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const CLAIM_STATUSES = ['pending', 'confirmed', 'rejected'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const USER_KINDS = ['registered', 'guest'] as const;
export type UserKind = (typeof USER_KINDS)[number];
