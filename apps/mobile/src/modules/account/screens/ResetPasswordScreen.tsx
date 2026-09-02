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

const MIN_PASSWORD_LENGTH = 8;

/** Typed against just the routes this screen uses, not a specific stack's
 * full param list — pushed from both OnboardingStack and ProfileStack. */
type Routes = {
  ResetPassword: { resetToken: string };
  ForgotPassword: undefined;
  Login: undefined;
};
type Props = NativeStackScreenProps<Routes, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { resetToken } = route.params;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);

  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;
  const passwordTooShort =
    passwordTouched &&
    password.length > 0 &&
    password.length < MIN_PASSWORD_LENGTH;
  const isValid =
    password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await authApi.resetPassword(resetToken, password);
      // Revokes all existing sessions server-side — the user has to log in
      // again with the new password either way, so land them on Login.
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (err) {
      const apiError = getApiError(err);
      if (apiError.code === 'INVALID_RESET_TOKEN') {
        setTokenExpired(true);
        setError(t('errors.invalidResetToken'));
      } else {
        setError(apiError.message);
      }
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll testID="screen-ResetPassword">
      <View style={styles.hero}>
        <Ionicons name="lock-closed-outline" size={40} color={colors.primary} />
      </View>
      <Text style={styles.title}>{t('forgotPassword.newPasswordTitle')}</Text>
      <Text style={styles.subtitle}>
        {t('forgotPassword.newPasswordSubtitle')}
      </Text>

      {error ? (
        <ErrorBanner message={error} testID="reset-password-error" />
      ) : null}

      <View style={styles.form}>
        <TextField
          label={t('forgotPassword.newPasswordLabel')}
          value={password}
          onChangeText={setPassword}
          onBlur={() => setPasswordTouched(true)}
          placeholder={t('forgotPassword.newPasswordLabel')}
          secureTextEntry
          error={passwordTooShort ? t('errors.passwordTooShort') : undefined}
          testID="reset-password-new"
        />
        <TextField
          label={t('forgotPassword.confirmPasswordLabel')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={t('forgotPassword.confirmPasswordLabel')}
          secureTextEntry
          error={passwordsMismatch ? t('errors.passwordMismatch') : undefined}
          testID="reset-password-confirm"
        />
      </View>

      {tokenExpired ? (
        <Button
          label={t('forgotPassword.startOver')}
          variant="outline"
          onPress={() =>
            navigation.reset({ index: 0, routes: [{ name: 'ForgotPassword' }] })
          }
          testID="reset-password-start-over"
        />
      ) : (
        <Button
          label={t('forgotPassword.submit')}
          onPress={() => void handleSubmit()}
          disabled={!isValid}
          loading={submitting}
          testID="reset-password-submit"
        />
      )}
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
