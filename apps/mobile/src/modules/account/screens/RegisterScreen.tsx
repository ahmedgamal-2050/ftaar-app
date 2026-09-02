import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../../navigation/types';
import { useAuth } from '../../../auth/AuthContext';
import { getApiError } from '../../../api/client';
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
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = NativeStackScreenProps<ProfileStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    EMAIL_PATTERN.test(email.trim()) && password.length >= MIN_PASSWORD_LENGTH;
  // Live, per-field feedback once each field's been left — the disabled
  // submit button alone never explained *why* it stayed disabled.
  const emailError =
    emailTouched && email.trim().length > 0 && !EMAIL_PATTERN.test(email.trim())
      ? t('errors.invalidEmail')
      : undefined;
  const passwordError =
    passwordTouched &&
    password.length > 0 &&
    password.length < MIN_PASSWORD_LENGTH
      ? t('errors.passwordTooShort')
      : undefined;

  const handleSubmit = async () => {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError(t('errors.invalidEmail'));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('errors.passwordTooShort'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await register(email.trim(), password);
      // Nothing else unmounts this screen on success — status stays 'ready'
      // (guest -> registered doesn't change it), so this has to navigate
      // back itself or the button spins forever.
      navigation.goBack();
    } catch (err) {
      const apiError = getApiError(err);
      setError(
        apiError.code === 'EMAIL_ALREADY_REGISTERED'
          ? t('register.emailAlreadyRegistered')
          : apiError.message,
      );
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll testID="screen-Register">
      <View style={styles.hero}>
        <Ionicons name="restaurant-outline" size={40} color={colors.primary} />
      </View>
      <Text style={styles.title}>{t('register.title')}</Text>
      <Text style={styles.subtitle}>{t('register.subtitle')}</Text>

      <View style={styles.form}>
        <TextField
          label={t('register.displayNameLabel')}
          value={user?.displayName ?? ''}
          editable={false}
          helperText={t('register.displayNameHelper')}
          testID="register-display-name"
        />
        <TextField
          label={t('register.emailLabel')}
          value={email}
          onChangeText={setEmail}
          onBlur={() => setEmailTouched(true)}
          placeholder={t('register.emailLabel')}
          keyboardType="email-address"
          autoCapitalize="none"
          error={emailError}
          testID="register-email"
        />
        <TextField
          label={t('register.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          onBlur={() => setPasswordTouched(true)}
          placeholder={t('register.passwordLabel')}
          secureTextEntry
          error={passwordError}
          testID="register-password"
        />
        {error ? <ErrorBanner message={error} testID="register-error" /> : null}
      </View>

      <Button
        label={t('register.submit')}
        onPress={() => void handleSubmit()}
        disabled={!isValid}
        loading={submitting}
        testID="register-submit"
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
  },
  form: {
    gap: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
});
