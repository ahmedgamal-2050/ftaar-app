import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { queryClient } from '../api/queryClient';
import { SafeAppFrame } from '../ui';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <SafeAppFrame>
          <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          </I18nextProvider>
        </SafeAppFrame>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = { fill: { flex: 1 } };
