import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { LobbyStackParamList } from './types';
import { LobbySetupScreen } from '../modules/lobby/screens/LobbySetupScreen';
import { LobbyShareScreen } from '../modules/lobby/screens/LobbyShareScreen';
import { LobbyRoomScreen } from '../modules/lobby/screens/LobbyRoomScreen';
import { OrderSummaryScreen } from '../modules/billing/screens/OrderSummaryScreen';
import { BillEntryScreen } from '../modules/billing/screens/BillEntryScreen';
import { BillReviewScreen } from '../modules/billing/screens/BillReviewScreen';
import { PaymentBoardScreen } from '../modules/payments/screens/PaymentBoardScreen';
import { LobbySettledScreen } from '../modules/payments/screens/LobbySettledScreen';
import { safeStackScreenOptions } from '../ui';

const Stack = createNativeStackNavigator<LobbyStackParamList>();

/** Pushed over MainTabs when a specific lobby is opened — never a tab itself. */
export function LobbyStack() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={safeStackScreenOptions()}>
      <Stack.Screen
        name="LobbySetup"
        component={LobbySetupScreen}
        options={{ title: t('lobby.setupTitle') }}
      />
      <Stack.Screen
        name="LobbyShare"
        component={LobbyShareScreen}
        options={{ title: t('lobby.shareTitle') }}
      />
      <Stack.Screen name="LobbyRoom" component={LobbyRoomScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="OrderSummary"
        component={OrderSummaryScreen}
        options={{ title: t('lobby.orderSummaryTitle') }}
      />
      <Stack.Screen
        name="BillEntry"
        component={BillEntryScreen}
        options={{ title: t('lobby.billEntryTitle') }}
      />
      <Stack.Screen
        name="BillReview"
        component={BillReviewScreen}
        options={{ title: t('lobby.billReviewTitle') }}
      />
      <Stack.Screen
        name="PaymentBoard"
        component={PaymentBoardScreen}
        options={{ title: t('lobby.paymentBoardTitle') }}
      />
      <Stack.Screen
        name="LobbySettled"
        component={LobbySettledScreen}
        options={{ title: t('lobby.settledTitle') }}
      />
    </Stack.Navigator>
  );
}
