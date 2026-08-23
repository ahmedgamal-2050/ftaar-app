import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import i18n, { getStoredLanguage } from '../i18n';
import { AppProviders } from './AppProviders';
import { AuthProvider } from '../auth/AuthContext';
import { RootNavigator } from '../navigation/RootNavigator';
import { colors, useAppFonts } from '../ui';

// Kept visible until RootNavigator hands off to a real screen (fonts, auth
// bootstrap and language restore all race against this).
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export function App() {
  const fontsReady = useAppFonts();
  const [languageRestored, setLanguageRestored] = useState(false);

  useEffect(() => {
    getStoredLanguage()
      .then((stored) =>
        stored && stored !== i18n.language
          ? i18n.changeLanguage(stored)
          : undefined,
      )
      .finally(() => setLanguageRestored(true));
  }, []);

  if (!fontsReady || !languageRestored) {
    return <View style={styles.bootSplash} />;
  }

  return (
    <AppProviders>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  bootSplash: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default App;
