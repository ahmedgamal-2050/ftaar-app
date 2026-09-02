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
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const trimmedName = name.trim();
  // Only surfaces once the field has been touched — typing from scratch on a
  // fresh screen shouldn't open with a "required" error already showing.
  const validationError =
    touched && !trimmedName ? t('errors.nameRequired') : null;
  const displayError = apiError ?? validationError;

  const handleContinue = async () => {
    setTouched(true);
    if (!trimmedName) {
      return;
    }
    setSubmitting(true);
    setApiError(null);
    try {
      await completeOnboarding(trimmedName);
    } catch (err) {
      setApiError(getApiError(err).message);
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
          onBlur={() => setTouched(true)}
          placeholder={t('onboarding.chooseNamePlaceholder')}
          error={displayError ?? undefined}
          helperText={
            displayError ? undefined : t('onboarding.chooseNameHelper')
          }
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
