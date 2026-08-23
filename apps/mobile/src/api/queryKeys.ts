/**
 * Query key factory mirroring the API shape (see spec §4). WebSocket
 * handlers invalidate by these same keys rather than patching cache
 * directly, so keep every key derived from here — never inline an array
 * literal at the call site.
 */
export const queryKeys = {
  lobby: (code: string) => ['lobby', code] as const,
  lobbyMembers: (code: string) => ['lobby', code, 'members'] as const,
  lobbyOrders: (code: string) => ['lobby', code, 'orders'] as const,
  lobbyMyOrders: (code: string) => ['lobby', code, 'orders', 'mine'] as const,
  lobbySummary: (code: string) => ['lobby', code, 'summary'] as const,
  lobbyBill: (code: string) => ['lobby', code, 'bill'] as const,
  lobbyPayments: (code: string) => ['lobby', code, 'payments'] as const,
  restaurants: () => ['restaurants'] as const,
  restaurantMenu: (restaurantId: string) =>
    ['restaurants', restaurantId, 'menu'] as const,
};
