import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './types';
import { WelcomeScreen } from '../modules/onboarding/screens/WelcomeScreen';
import { ChooseNameScreen } from '../modules/onboarding/screens/ChooseNameScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/** Shown only while no local session exists. Exactly Welcome then ChooseName. */
export function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="ChooseName" component={ChooseNameScreen} />
    </Stack.Navigator>
  );
}
