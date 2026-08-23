import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { en } from './locales/en';
import { ar } from './locales/ar';

export const SUPPORTED_LANGUAGES = ['en', 'ar'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const RTL_LANGUAGES: readonly SupportedLanguage[] = ['ar'];
const LANGUAGE_STORAGE_KEY = 'ftaar.language';

function isSupportedLanguage(tag: string): tag is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(tag);
}

function resolveInitialLanguage(): SupportedLanguage {
  const deviceTag = Localization.getLocales()[0]?.languageCode ?? 'en';
  return isSupportedLanguage(deviceTag) ? deviceTag : 'en';
}

/** The language the user explicitly picked on a previous launch, if any. */
export async function getStoredLanguage(): Promise<SupportedLanguage | null> {
  const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored && isSupportedLanguage(stored) ? stored : null;
}

/**
 * Switches the active language and, for RTL languages, flips
 * `I18nManager`'s native RTL flag. That flag only takes effect after the JS
 * bundle reloads (see spec §5) — callers must prompt the user to restart
 * the app when `needsRestart` comes back true rather than rendering a
 * half-flipped layout.
 */
export async function setAppLanguage(
  language: SupportedLanguage,
): Promise<{ needsRestart: boolean }> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  await i18n.changeLanguage(language);

  const shouldBeRTL = RTL_LANGUAGES.includes(language);
  const needsRestart = shouldBeRTL !== I18nManager.isRTL;
  if (needsRestart) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
  }
  return { needsRestart };
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: resolveInitialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
