import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type {
  HistoryStackParamList,
  HomeStackParamList,
  MainTabParamList,
  ProfileStackParamList,
  RestaurantsStackParamList,
} from './types';
import { HomeScreen } from '../modules/home/screens/HomeScreen';
import { JoinByCodeScreen } from '../modules/home/screens/JoinByCodeScreen';
import { MyLobbiesScreen } from '../modules/history/screens/MyLobbiesScreen';
import { RestaurantListScreen } from '../modules/restaurants/screens/RestaurantListScreen';
import { RestaurantFormScreen } from '../modules/restaurants/screens/RestaurantFormScreen';
import { MenuManagerScreen } from '../modules/restaurants/screens/MenuManagerScreen';
import { BulkMenuPasteScreen } from '../modules/restaurants/screens/BulkMenuPasteScreen';
import { ProfileScreen } from '../modules/account/screens/ProfileScreen';
import { RegisterScreen } from '../modules/account/screens/RegisterScreen';
import { LoginScreen } from '../modules/account/screens/LoginScreen';
import { ForgotPasswordStubScreen } from '../modules/account/screens/ForgotPasswordStubScreen';
import { colors, safeStackScreenOptions, typography } from '../ui';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
const HistoryStackNav = createNativeStackNavigator<HistoryStackParamList>();
const RestaurantsStackNav = createNativeStackNavigator<RestaurantsStackParamList>();
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();

function HomeStack() {
  const { t } = useTranslation();
  return (
    <HomeStackNav.Navigator screenOptions={safeStackScreenOptions()}>
      <HomeStackNav.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{ title: t('tabs.home') }}
      />
      <HomeStackNav.Screen
        name="JoinByCode"
        component={JoinByCodeScreen}
        options={{ title: t('home.joinByCode') }}
      />
    </HomeStackNav.Navigator>
  );
}

function HistoryStack() {
  const { t } = useTranslation();
  return (
    <HistoryStackNav.Navigator screenOptions={safeStackScreenOptions()}>
      <HistoryStackNav.Screen
        name="MyLobbies"
        component={MyLobbiesScreen}
        options={{ title: t('tabs.history') }}
      />
    </HistoryStackNav.Navigator>
  );
}

/**
 * Guests and registered users get the same routes: RestaurantList renders a
 * read-only notice for guests rather than swapping the stack, so navigating to
 * any restaurant route can never hit a missing screen.
 */
function RestaurantsStack() {
  const { t } = useTranslation();
  return (
    <RestaurantsStackNav.Navigator screenOptions={safeStackScreenOptions()}>
      <RestaurantsStackNav.Screen
        name="RestaurantList"
        component={RestaurantListScreen}
        options={{ title: t('tabs.restaurants') }}
      />
      <RestaurantsStackNav.Screen
        name="RestaurantForm"
        component={RestaurantFormScreen}
        options={{ title: t('restaurants.formTitle') }}
      />
      <RestaurantsStackNav.Screen
        name="MenuManager"
        component={MenuManagerScreen}
        options={{ title: t('restaurants.menuTitle') }}
      />
      <RestaurantsStackNav.Screen
        name="BulkMenuPaste"
        component={BulkMenuPasteScreen}
        options={{ title: t('restaurants.bulkPasteTitle') }}
      />
    </RestaurantsStackNav.Navigator>
  );
}

function ProfileStack() {
  const { t } = useTranslation();
  return (
    <ProfileStackNav.Navigator screenOptions={safeStackScreenOptions()}>
      <ProfileStackNav.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={{ title: t('tabs.profile') }}
      />
      <ProfileStackNav.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: t('register.title') }}
      />
      <ProfileStackNav.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: t('account.logIn') }}
      />
      <ProfileStackNav.Screen
        name="ForgotPasswordStub"
        component={ForgotPasswordStubScreen}
        options={{ title: t('account.forgotPassword') }}
      />
    </ProfileStackNav.Navigator>
  );
}

const TAB_ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  History: 'time-outline',
  Restaurants: 'storefront-outline',
  Profile: 'person-outline',
};

/** Exactly four entries, in this order. Nothing else belongs in this bar. */
export function MainTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: typography.caption.fontFamily },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name as keyof MainTabParamList]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: t('tabs.home') }} />
      <Tab.Screen name="History" component={HistoryStack} options={{ title: t('tabs.history') }} />
      <Tab.Screen
        name="Restaurants"
        component={RestaurantsStack}
        options={{ title: t('tabs.restaurants') }}
      />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ title: t('tabs.profile') }} />
    </Tab.Navigator>
  );
}
