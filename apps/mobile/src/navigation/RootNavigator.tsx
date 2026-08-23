import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList } from './types';
import { useAuth } from '../auth/AuthContext';
import { OnboardingStack } from './OnboardingStack';
import { MainTabs } from './MainTabs';
import { LobbyStack } from './LobbyStack';
import { HEADERLESS_EDGES, Screen, colors, radius, spacing, typography } from '../ui';

const RootStack = createNativeStackNavigator<RootStackParamList>();

function BootstrapError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Screen
      edges={HEADERLESS_EDGES}
      center
      style={styles.center}
      testID="bootstrap-error"
    >
      <Text style={styles.errorTitle}>{t('bootstrapError.title')}</Text>
      <Text style={styles.errorBody}>{message ?? t('bootstrapError.body')}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryLabel}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </Screen>
  );
}

export function RootNavigator() {
  const { status, error, retry } = useAuth();

  useEffect(() => {
    if (status !== 'bootstrapping') {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [status]);

  if (status === 'bootstrapping') {
    return (
      <View style={styles.bootstrapping}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (status === 'error') {
    return <BootstrapError message={error} onRetry={retry} />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {status === 'needs-onboarding' ? (
          <RootStack.Screen name="OnboardingStack" component={OnboardingStack} />
        ) : (
          <>
            <RootStack.Screen name="MainTabs" component={MainTabs} />
            <RootStack.Screen
              name="LobbyStack"
              component={LobbyStack}
              options={{ presentation: 'modal' }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  bootstrapping: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  center: {
    alignItems: 'center',
    gap: spacing.md,
  },
  errorTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  errorBody: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  retryLabel: {
    ...typography.label,
    color: colors.onPrimary,
  },
});
