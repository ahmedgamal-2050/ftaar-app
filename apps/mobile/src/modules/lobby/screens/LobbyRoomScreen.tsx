import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type {
  LobbyRoomTabParamList,
  LobbyStackParamList,
} from '../../../navigation/types';
import { MenuTabScreen } from '../../lobby-room/screens/MenuTabScreen';
import { MyCartTabScreen } from '../../lobby-room/screens/MyCartTabScreen';
import { GroupTabScreen } from '../../lobby-room/screens/GroupTabScreen';
import { colors } from '../../../ui';
import { useLobbyByCode } from '../hooks/useLobby';

const Tab = createBottomTabNavigator<LobbyRoomTabParamList>();

type Props = NativeStackScreenProps<LobbyStackParamList, 'LobbyRoom'>;

const TAB_ICONS: Record<
  keyof LobbyRoomTabParamList,
  keyof typeof Ionicons.glyphMap
> = {
  Menu: 'restaurant-outline',
  MyCart: 'cart-outline',
  Group: 'people-outline',
};

/**
 * Menu / MyCart / Group are sub-tabs of this one lobby screen, not top-level
 * destinations — the app's bottom tab bar always stays Home / History /
 * Restaurants / Profile. The LobbyStack is presented over those tabs, so only
 * one tab bar is ever on screen.
 */
export function LobbyRoomScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { lobbyCode } = route.params;

  // Once the host finalises the bill the room is no longer where the action
  // is — everyone needs the payment board, and after close-out the receipt.
  // The lobby query already polls, so this is how a member who is sitting on
  // the Menu tab gets carried into the payment phase without being told.
  const { data: lobby } = useLobbyByCode(lobbyCode);
  const status = lobby?.status;
  useEffect(() => {
    if (status === 'billed') {
      navigation.replace('PaymentBoard', { lobbyCode });
    } else if (status === 'settled') {
      navigation.replace('LobbySettled', { lobbyCode });
    }
  }, [status, lobbyCode, navigation]);

  return (
    <Tab.Navigator
      screenOptions={({ route: tabRoute }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={TAB_ICONS[tabRoute.name as keyof LobbyRoomTabParamList]}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Menu"
        component={MenuTabScreen}
        initialParams={{ lobbyCode }}
        options={{ title: t('lobbyRoom.menu') }}
      />
      <Tab.Screen
        name="MyCart"
        component={MyCartTabScreen}
        initialParams={{ lobbyCode }}
        options={{ title: t('lobbyRoom.myCart') }}
      />
      <Tab.Screen
        name="Group"
        component={GroupTabScreen}
        initialParams={{ lobbyCode }}
        options={{ title: t('lobbyRoom.group') }}
      />
    </Tab.Navigator>
  );
}
