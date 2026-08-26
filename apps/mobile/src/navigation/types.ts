import type { NavigatorScreenParams } from '@react-navigation/native';

// One param list per navigator in the tree, mirroring the screen map exactly.
// Every route's params are declared here — navigation is never typed `any`.

/** The forgot-password flow's routes — same three screens under both
 * OnboardingStack and ProfileStack (see LoginScreen/ForgotPassword*Screen's
 * Props, typed against this shared subset rather than either stack's full
 * param list). */
export type ForgotPasswordRoutes = {
  ForgotPassword: undefined;
  ForgotPasswordOtp: { email: string };
  ResetPassword: { resetToken: string };
};

export type OnboardingStackParamList = {
  Welcome: undefined;
  ChooseName: undefined;
  /** Reachable from Welcome's "Already have an account?" link — lets a
   * device with no session at all skip straight past guest onboarding. */
  Login: undefined;
} & ForgotPasswordRoutes;

export type HomeStackParamList = {
  HomeScreen: undefined;
  JoinByCode: { prefilledCode?: string } | undefined;
};

export type HistoryStackParamList = {
  MyLobbies: undefined;
};

export type RestaurantsStackParamList = {
  RestaurantList: undefined;
  RestaurantForm: { restaurantId?: string } | undefined;
  MenuManager: { restaurantId: string };
  BulkMenuPaste: { restaurantId: string };
};

export type ProfileStackParamList = {
  ProfileScreen: undefined;
  Register: undefined;
  Login: undefined;
} & ForgotPasswordRoutes;

/** Exactly four entries, in this order. The Group view is a LobbyRoom sub-tab. */
export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  History: NavigatorScreenParams<HistoryStackParamList>;
  Restaurants: NavigatorScreenParams<RestaurantsStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

/** Sub-tabs inside LobbyRoom, not top-level destinations. */
export type LobbyRoomTabParamList = {
  Menu: { lobbyCode: string };
  MyCart: { lobbyCode: string };
  Group: { lobbyCode: string };
};

/**
 * Every route here is scoped to one lobby. LobbySetup is the exception: it
 * runs before a code has been issued, so it carries the restaurant choice
 * instead.
 */
export type LobbyStackParamList = {
  LobbySetup: { restaurantId?: string } | undefined;
  LobbyShare: { lobbyCode: string };
  LobbyRoom: { lobbyCode: string };
  OrderSummary: { lobbyCode: string };
  BillEntry: { lobbyCode: string };
  BillReview: { lobbyCode: string };
  PaymentBoard: { lobbyCode: string };
  LobbySettled: { lobbyCode: string };
};

export type RootStackParamList = {
  OnboardingStack: NavigatorScreenParams<OnboardingStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  LobbyStack: NavigatorScreenParams<LobbyStackParamList>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface
    interface RootParamList extends RootStackParamList {}
  }
}
