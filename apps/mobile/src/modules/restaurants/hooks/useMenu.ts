import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../api/queryKeys';
import { menuApi } from '../../../api/endpoints/menu';
import type {
  BulkMenuItemPayload,
  CreateMenuItemPayload,
  UpdateMenuItemPayload,
} from '../../../api/endpoints/menu';

/** Fetches all menu items for a restaurant, including retired ones.
 *  Used by the management screen (registered users only). */
export function useMenu(restaurantId: string) {
  return useQuery({
    queryKey: queryKeys.restaurantMenu(restaurantId),
    queryFn: () => menuApi.list(restaurantId, /* includeInactive */ true),
    enabled: !!restaurantId,
  });
}

/** Add a single menu item and refresh the menu list. */
export function useAddMenuItem(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMenuItemPayload) =>
      menuApi.create(restaurantId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.restaurantMenu(restaurantId),
      });
    },
  });
}

/** Partially update a menu item (name, category, price). */
export function useUpdateMenuItem(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateMenuItemPayload;
    }) => menuApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.restaurantMenu(restaurantId),
      });
    },
  });
}

/** Retire a menu item (sets isActive=false).
 *  Past orders referencing this item are never affected. */
export function useRetireMenuItem(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => menuApi.retire(itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.restaurantMenu(restaurantId),
      });
    },
  });
}

/** Bulk-create up to 200 items in one transaction. */
export function useBulkMenu(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: BulkMenuItemPayload[]) =>
      menuApi.bulk(restaurantId, items),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.restaurantMenu(restaurantId),
      });
    },
  });
}
