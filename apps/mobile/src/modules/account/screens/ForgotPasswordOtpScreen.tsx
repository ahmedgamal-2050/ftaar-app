import React, { useEffect, useState } from 'react';
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

const OTP_LENGTH = 6;
// Matches the backend's PASSWORD_RESET_OTP_RESEND_COOLDOWN_SECONDS default —
// there's no endpoint that reports the real value, and forgot-password
// silently no-ops within its cooldown rather than erroring, so this is
// tracked client-side only.
const RESEND_COOLDOWN_SECONDS = 60;

/** Typed against just the routes this screen uses, not a specific stack's
 * full param list — pushed from both OnboardingStack and ProfileStack. */
type Routes = {
  ForgotPasswordOtp: { email: string };
  ResetPassword: { resetToken: string };
};
type Props = NativeStackScreenProps<Routes, 'ForgotPasswordOtp'>;

export function ForgotPasswordOtpScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((seconds) => (seconds > 0 ? seconds - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const isValid = otp.length === OTP_LENGTH;

  const handleVerify = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { resetToken } = await authApi.verifyForgotPasswordOtp(email, otp);
      // `navigate` pushes rather than unmounting this screen — it's still
      // there underneath, and stays there if the user comes back, so this
      // has to reset the spinner itself or it's frozen mid-spin forever.
      navigation.navigate('ResetPassword', { resetToken });
      setSubmitting(false);
    } catch (err) {
      const apiError = getApiError(err);
      const message =
        apiError.code === 'INVALID_OTP'
          ? t('errors.invalidOtp')
          : apiError.code === 'OTP_EXPIRED'
            ? t('errors.otpExpired')
            : apiError.code === 'OTP_TOO_MANY_ATTEMPTS'
              ? t('errors.otpTooManyAttempts')
              : apiError.message;
      setError(message);
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen scroll testID="screen-ForgotPasswordOtp">
      <View style={styles.hero}>
        <Ionicons
          name="chatbox-ellipses-outline"
          size={40}
          color={colors.primary}
        />
      </View>
      <Text style={styles.title}>{t('forgotPassword.otpTitle')}</Text>
      <Text style={styles.subtitle}>
        {t('forgotPassword.otpSubtitle', { email })}
      </Text>

      {error ? (
        <ErrorBanner message={error} testID="forgot-password-otp-error" />
      ) : null}

      <View style={styles.form}>
        <TextField
          label={t('forgotPassword.otpLabel')}
          value={otp}
          onChangeText={(value) =>
            setOtp(value.replace(/\D/g, '').slice(0, OTP_LENGTH))
          }
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          testID="forgot-password-otp-input"
        />
      </View>

      <Button
        label={t('forgotPassword.verify')}
        onPress={() => void handleVerify()}
        disabled={!isValid}
        loading={submitting}
        testID="forgot-password-otp-verify"
      />
      <Button
        label={
          secondsLeft > 0
            ? t('forgotPassword.resendIn', { seconds: secondsLeft })
            : t('forgotPassword.resend')
        }
        variant="outline"
        onPress={() => void handleResend()}
        disabled={secondsLeft > 0}
        loading={resending}
        style={styles.resendButton}
        testID="forgot-password-otp-resend"
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
  resendButton: {
    marginTop: spacing.md,
  },
});
