import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../auth/AuthContext';
import { getApiError } from '../../../api/client';
import {
  Button,
  HEADERLESS_EDGES,
  Screen,
  TextField,
  colors,
  radius,
  spacing,
  typography,
} from '../../../ui';

export function ChooseNameScreen() {
  const { t } = useTranslation();
  const { completeOnboarding } = useAuth();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();

  const handleContinue = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await completeOnboarding(trimmedName);
    } catch (err) {
      setError(getApiError(err).message);
      setSubmitting(false);
    }
  };

  return (
    <Screen edges={HEADERLESS_EDGES} scroll testID="screen-ChooseName">
      <View style={styles.hero}>
        <Ionicons name="hand-left-outline" size={40} color={colors.primary} />
      </View>
      <Text style={styles.title}>{t('onboarding.chooseNameTitle')}</Text>
      <Text style={styles.subtitle}>{t('onboarding.chooseNameSubtitle')}</Text>

      <View style={styles.form}>
        <TextField
          label={t('onboarding.chooseNamePlaceholder')}
          value={name}
          onChangeText={setName}
          placeholder={t('onboarding.chooseNamePlaceholder')}
          error={error ?? undefined}
          helperText={error ? undefined : t('onboarding.chooseNameHelper')}
          testID="choose-name-input"
        />
      </View>

      <Button
        label={t('onboarding.continue')}
        onPress={() => void handleContinue()}
        disabled={!trimmedName}
        loading={submitting}
        testID="choose-name-continue"
      />
      <Text style={styles.footer}>{t('onboarding.chooseNameFooter')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  form: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  footer: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
