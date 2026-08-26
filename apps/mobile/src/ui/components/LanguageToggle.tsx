import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setAppLanguage, type SupportedLanguage } from '../../i18n';
import { spacing } from '../theme';
import { Button } from './Button';

interface LanguageToggleProps {
  /** `sm` covers the compact Profile row; the default fits Welcome's
   * full-width pills. */
  size?: 'md' | 'sm';
  testID?: string;
}

/** EN/AR switch backed by `setAppLanguage` (see apps/mobile/src/i18n) — the
 * only piece this doesn't already provide is the restart prompt, shown here
 * since flipping `I18nManager`'s RTL flag only takes effect after reload. */
export function LanguageToggle({ size = 'md', testID }: LanguageToggleProps) {
  const { t, i18n } = useTranslation();
  const current: SupportedLanguage = i18n.language === 'ar' ? 'ar' : 'en';

  const handleSelect = async (language: SupportedLanguage) => {
    if (language === current) {
      return;
    }
    const { needsRestart } = await setAppLanguage(language);
    if (needsRestart) {
      Alert.alert(
        t('common.restartRequiredTitle'),
        t('common.restartRequiredBody'),
        [{ text: t('common.ok') }],
      );
    }
  };

  return (
    <View style={styles.row} testID={testID}>
      <Button
        label={size === 'sm' ? 'EN' : t('common.languageEnglish')}
        size={size}
        variant={current === 'en' ? 'primary' : 'outline'}
        onPress={() => void handleSelect('en')}
        style={size === 'md' && styles.pillWide}
        testID={testID ? `${testID}-en` : undefined}
      />
      <Button
        label={size === 'sm' ? 'AR' : t('common.languageArabic')}
        size={size}
        variant={current === 'ar' ? 'primary' : 'outline'}
        onPress={() => void handleSelect('ar')}
        style={size === 'md' && styles.pillWide}
        testID={testID ? `${testID}-ar` : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pillWide: {
    flex: 1,
  },
});
