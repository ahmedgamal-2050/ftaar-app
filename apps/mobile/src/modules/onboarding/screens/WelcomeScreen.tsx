import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../../navigation/types';
import {
  Button,
  HEADERLESS_EDGES,
  LanguageToggle,
  Screen,
  colors,
  radius,
  spacing,
  typography,
} from '../../../ui';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const { t } = useTranslation();

  return (
    <Screen edges={HEADERLESS_EDGES} testID="screen-Welcome">
      <View style={styles.content}>
        <Text style={styles.brand}>Fatoor</Text>
        <View style={styles.hero}>
          <Ionicons name="restaurant" size={56} color={colors.primary} />
        </View>
        <Text style={styles.title}>{t('onboarding.welcomeTitle')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.welcomeSubtitle')}</Text>
      </View>
      <View style={styles.actions}>
        <LanguageToggle testID="welcome-language" />
        <Button
          label={t('onboarding.getStarted')}
          onPress={() => navigation.navigate('ChooseName')}
          testID="welcome-get-started"
        />
        <Text
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
          testID="welcome-login-link"
        >
          {t('onboarding.alreadyHaveAccount')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  brand: {
    ...typography.display,
    color: colors.primary,
  },
  hero: {
    width: 160,
    height: 160,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
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
  actions: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  loginLink: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
