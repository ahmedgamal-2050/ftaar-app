import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { OnboardingStackParamList } from './types';
import { WelcomeScreen } from '../modules/onboarding/screens/WelcomeScreen';
import { ChooseNameScreen } from '../modules/onboarding/screens/ChooseNameScreen';
import { LoginScreen } from '../modules/account/screens/LoginScreen';
import { ForgotPasswordScreen } from '../modules/account/screens/ForgotPasswordScreen';
import { ForgotPasswordOtpScreen } from '../modules/account/screens/ForgotPasswordOtpScreen';
import { ResetPasswordScreen } from '../modules/account/screens/ResetPasswordScreen';
import { safeStackScreenOptions } from '../ui';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

const HEADERED = () => ({ ...safeStackScreenOptions(), headerShown: true });

/**
 * Shown only while no local session exists. Welcome and ChooseName are the
 * guest-first path (headerless); Login and the forgot-password flow are
 * reachable from Welcome's "Already have an account?" link for a device
 * that already has a registered account — the same screens ProfileStack
 * pushes once a guest session already exists.
 */
export function OnboardingStack() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="ChooseName" component={ChooseNameScreen} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ ...HEADERED(), title: t('account.logIn') }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ ...HEADERED(), title: t('forgotPassword.title') }}
      />
      <Stack.Screen
        name="ForgotPasswordOtp"
        component={ForgotPasswordOtpScreen}
        options={{ ...HEADERED(), title: t('forgotPassword.otpTitle') }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ ...HEADERED(), title: t('forgotPassword.newPasswordTitle') }}
      />
    </Stack.Navigator>
  );
}
