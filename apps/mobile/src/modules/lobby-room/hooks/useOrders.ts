import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../api/queryKeys';
import { ordersApi } from '../../../api/endpoints/orders';
import type {
  AddOrderItemPayload,
  MemberOrderSummary,
  OrderItem,
} from '../../../api/endpoints/orders';
import type { MenuItem } from '../../../api/endpoints/menu';

/** No websocket push yet (see queryKeys.ts) — short polling stands in for
 * "real time" cart/group updates while a lobby-room tab is on screen. */
const ORDERS_POLL_MS = 4000;

// ── Money helpers (display-only) ────────────────────────────────────────────
// Optimistic totals only ever live until the mutation settles and the real
// server response replaces them — integer-piastre math just keeps that
// placeholder from drifting by a cent the way float math could.

function toPiastres(egp: string): number {
  return Math.round(parseFloat(egp) * 100);
}

function fromPiastres(piastres: number): string {
  return (piastres / 100).toFixed(2);
}

function recomputeSubtotal(items: OrderItem[]): string {
  const total = items.reduce(
    (sum, item) => sum + toPiastres(item.lineTotal),
    0,
  );
  return fromPiastres(total);
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** The current member's own order items in this lobby. */
export function useMyOrder(lobbyCode: string, lobbyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.lobbyMyOrders(lobbyCode),
    queryFn: () => ordersApi.findMine(lobbyId as string),
    enabled: !!lobbyId,
    refetchInterval: ORDERS_POLL_MS,
  });
}

/** Admin only — every member's order items, for the Group tab's live roster. */
export function useLobbyOrders(
  lobbyCode: string,
  lobbyId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.lobbyOrders(lobbyCode),
    queryFn: () => ordersApi.listForLobby(lobbyId as string),
    enabled: enabled && !!lobbyId,
    refetchInterval: ORDERS_POLL_MS,
  });
}

/** Admin only — items merged across the whole lobby, for reading aloud to
 * the restaurant. */
export function useOrderSummary(
  lobbyCode: string,
  lobbyId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.lobbySummary(lobbyCode),
    queryFn: () => ordersApi.getSummary(lobbyId as string),
    enabled: enabled && !!lobbyId,
    refetchInterval: ORDERS_POLL_MS,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────
// Each optimistically patches the `mine` cache so a tap shows up before the
// round trip finishes, rolls back on failure, and reconciles with the server
// truth (real price, real id) once the request settles.

interface MutationContext {
  previous: MemberOrderSummary | undefined;
}

function useSettleOrders(lobbyCode: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.lobbyMyOrders(lobbyCode),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.lobbyOrders(lobbyCode),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.lobbySummary(lobbyCode),
    });
  };
}

/** Adds one unit of a menu item, or increments it if already in the cart. */
export function useAddOrderItem(lobbyCode: string, lobbyId: string) {
  const queryClient = useQueryClient();
  const settle = useSettleOrders(lobbyCode);
  const key = queryKeys.lobbyMyOrders(lobbyCode);

  return useMutation<
    MemberOrderSummary,
    unknown,
    AddOrderItemPayload & { menuItem: MenuItem },
    MutationContext
  >({
    mutationFn: ({ menuItemId, qty }) =>
      ordersApi.addItem(lobbyId, { menuItemId, qty }),
    onMutate: async ({ menuItem, qty }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemberOrderSummary>(key);
      const current = previous ?? { items: [], subtotal: '0.00' };
      const existing = current.items.find((i) => i.menuItemId === menuItem.id);

      let items: OrderItem[];
      if (existing) {
        const newQty = existing.qty + qty;
        items = current.items.map((i) =>
          i.id === existing.id
            ? {
                ...i,
                qty: newQty,
                lineTotal: fromPiastres(toPiastres(i.actualPrice) * newQty),
              }
            : i,
        );
      } else {
        const optimistic: OrderItem = {
          id: `optimistic-${menuItem.id}`,
          lobbyId,
          lobbyMemberId: 'optimistic',
          menuItemId: menuItem.id,
          restaurantId: menuItem.restaurantId,
          qty,
          actualPrice: menuItem.referencePrice,
          lineTotal: fromPiastres(toPiastres(menuItem.referencePrice) * qty),
          createdAt: new Date().toISOString(),
          menuItem: {
            id: menuItem.id,
            name: menuItem.name,
            category: menuItem.category,
          },
        };
        items = [...current.items, optimistic];
      }

      queryClient.setQueryData<MemberOrderSummary>(key, {
        items,
        subtotal: recomputeSubtotal(items),
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: settle,
  });
}

/** Sets the exact quantity of an item already in the cart. */
export function useUpdateOrderItem(lobbyCode: string, lobbyId: string) {
  const queryClient = useQueryClient();
  const settle = useSettleOrders(lobbyCode);
  const key = queryKeys.lobbyMyOrders(lobbyCode);

  return useMutation<
    MemberOrderSummary,
    unknown,
    { itemId: string; qty: number },
    MutationContext
  >({
    mutationFn: ({ itemId, qty }) =>
      ordersApi.updateItem(lobbyId, itemId, { qty }),
    onMutate: async ({ itemId, qty }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemberOrderSummary>(key);
      const items = (previous?.items ?? []).map((i) =>
        i.id === itemId
          ? {
              ...i,
              qty,
              lineTotal: fromPiastres(toPiastres(i.actualPrice) * qty),
            }
          : i,
      );
      queryClient.setQueryData<MemberOrderSummary>(key, {
        items,
        subtotal: recomputeSubtotal(items),
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: settle,
  });
}

/** Removes an item from the cart entirely. */
export function useRemoveOrderItem(lobbyCode: string, lobbyId: string) {
  const queryClient = useQueryClient();
  const settle = useSettleOrders(lobbyCode);
  const key = queryKeys.lobbyMyOrders(lobbyCode);

  return useMutation<MemberOrderSummary, unknown, string, MutationContext>({
    mutationFn: (itemId) => ordersApi.removeItem(lobbyId, itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemberOrderSummary>(key);
      const items = (previous?.items ?? []).filter((i) => i.id !== itemId);
      queryClient.setQueryData<MemberOrderSummary>(key, {
        items,
        subtotal: recomputeSubtotal(items),
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: settle,
  });
}
