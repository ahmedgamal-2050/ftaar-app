import { QueryClient, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

// Wires TanStack Query's online/offline detection to NetInfo so queries
// pause and auto-resume around connectivity drops (see spec §4, Offline).
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(
      Boolean(state.isConnected && state.isInternetReachable !== false),
    );
  });
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
