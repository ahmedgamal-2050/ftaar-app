import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getApiError } from '../../../api/client';
import { authApi } from '../../../api/endpoints/auth';
import {
  Button,
  ErrorBanner,
  Screen,
  TextField,
  colors,
  radius,
  spacing,
  typography,
} from '../../../ui';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Typed against just the two routes this screen uses, not a specific
 * stack's full param list — pushed from both OnboardingStack and
 * ProfileStack's Login screen. */
type Routes = {
  ForgotPassword: undefined;
  ForgotPasswordOtp: { email: string };
};
type Props = NativeStackScreenProps<Routes, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = EMAIL_PATTERN.test(email.trim());

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Always succeeds — the backend never reveals whether the email
      // exists, so any failure here is a genuine network/server problem.
      await authApi.forgotPassword(email.trim());
      // `navigate` pushes rather than unmounting this screen — it's still
      // there underneath, and stays there if the user comes back, so this
      // has to reset the spinner itself or it's frozen mid-spin forever.
      navigation.navigate('ForgotPasswordOtp', { email: email.trim() });
      setSubmitting(false);
    } catch (err) {
      setError(getApiError(err).message);
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll testID="screen-ForgotPassword">
      <View style={styles.hero}>
        <Ionicons name="key-outline" size={40} color={colors.primary} />
      </View>
      <Text style={styles.title}>{t('forgotPassword.title')}</Text>
      <Text style={styles.subtitle}>{t('forgotPassword.subtitle')}</Text>

      {error ? (
        <ErrorBanner message={error} testID="forgot-password-error" />
      ) : null}

      <View style={styles.form}>
        <TextField
          label={t('forgotPassword.emailLabel')}
          value={email}
          onChangeText={setEmail}
          placeholder={t('forgotPassword.emailLabel')}
          keyboardType="email-address"
          autoCapitalize="none"
          testID="forgot-password-email"
        />
      </View>

      <Button
        label={t('forgotPassword.sendCode')}
        onPress={() => void handleSubmit()}
        disabled={!isValid}
        loading={submitting}
        testID="forgot-password-submit"
      />
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
    marginBottom: spacing.lg,
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
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
});
