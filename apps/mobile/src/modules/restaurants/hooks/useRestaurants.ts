import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../api/queryKeys';
import { restaurantsApi } from '../../../api/endpoints/restaurants';
import type { CreateRestaurantPayload } from '../../../api/endpoints/restaurants';

/** Fetches the paginated restaurant list (active only).
 *  Guests and registered users both have read access. */
export function useRestaurants(search?: string) {
  return useQuery({
    queryKey: [...queryKeys.restaurants(), { search }] as const,
    queryFn: () => restaurantsApi.list({ search: search?.trim() || undefined }),
  });
}

/** Creates a restaurant and invalidates the list so every subscriber
 *  — including other team members' cached queries — refreshes. */
export function useCreateRestaurant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRestaurantPayload) =>
      restaurantsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.restaurants() });
    },
  });
}
