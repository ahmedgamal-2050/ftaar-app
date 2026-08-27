import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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

/** Pushed from both OnboardingStack (no session yet) and ProfileStack (an
 * existing guest wants to log into a different registered account) — typed
 * against the routes this screen actually uses rather than either stack's
 * full param list, since both satisfy it structurally. */
type LoginRoutes = { Login: undefined; ForgotPassword: undefined };
type Props = NativeStackScreenProps<LoginRoutes, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = email.trim().length > 0 && password.length > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      // Nothing else unmounts this screen on success — status stays 'ready',
      // so this has to navigate back itself or the button spins forever.
      navigation.goBack();
    } catch (err) {
      const apiError = getApiError(err);
      setError(
        apiError.code === 'INVALID_CREDENTIALS'
          ? t('account.invalidCredentials')
          : apiError.message,
      );
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll testID="screen-Login">
      <View style={styles.hero}>
        <Ionicons name="cafe-outline" size={40} color={colors.primary} />
      </View>
      <Text style={styles.title}>{t('account.welcomeBackTitle')}</Text>
      <Text style={styles.subtitle}>{t('account.welcomeBackSubtitle')}</Text>

      {error ? <ErrorBanner message={error} testID="login-error" /> : null}

      <View style={styles.form}>
        <TextField
          label={t('account.emailLabel')}
          value={email}
          onChangeText={setEmail}
          placeholder={t('account.emailLabel')}
          keyboardType="email-address"
          autoCapitalize="none"
          testID="login-email"
        />
        <TextField
          label={t('account.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          placeholder={t('account.passwordLabel')}
          secureTextEntry
          testID="login-password"
        />
      </View>

      <Button
        label={t('account.logIn')}
        onPress={() => void handleSubmit()}
        disabled={!isValid}
        loading={submitting}
        testID="login-submit"
      />
      <Text
        style={styles.forgotPassword}
        onPress={() => navigation.navigate('ForgotPassword')}
        testID="login-forgot-password"
      >
        {t('account.forgotPassword')}
      </Text>
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
  forgotPassword: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
