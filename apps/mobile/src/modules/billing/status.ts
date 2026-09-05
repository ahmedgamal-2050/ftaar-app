import type { LobbyStatus } from '../../api/endpoints/lobbies';

/**
 * The spec's "arrived" stage — the food is here and the host is pricing it —
 * is stored as `locked` until it gets a status of its own, and finalise moves
 * the lobby to `billed`. See docs/backend-billing.md.
 */
export const ARRIVED_STATUS: LobbyStatus = 'locked';
export const BILLED_STATUS: LobbyStatus = 'billed';
