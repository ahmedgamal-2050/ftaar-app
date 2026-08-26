import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../../navigation/types';
import { useAuth } from '../../../auth/AuthContext';
import {
  Button,
  LanguageToggle,
  MemberChip,
  Screen,
  colors,
  radius,
  spacing,
  typography,
} from '../../../ui';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileScreen'>;

export function ProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const displayName = user?.displayName ?? 'Guest';
  const isGuest = user?.isGuest ?? true;

  return (
    <Screen scroll testID="screen-ProfileScreen">
      <View style={styles.header}>
        <MemberChip name={displayName} size="lg" testID="profile-avatar" />
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
      </View>

      {isGuest ? (
        <View style={styles.guestCard}>
          <Text style={styles.guestTitle}>
            {t('profile.guestAccountTitle')}
          </Text>
          <Text style={styles.guestBody}>{t('profile.guestAccountBody')}</Text>
          <Button
            label={t('profile.registerCta')}
            onPress={() => navigation.navigate('Register')}
            testID="profile-register-cta"
          />
        </View>
      ) : null}

      <Text style={styles.sectionHeader}>
        {t('profile.preferencesSection')}
      </Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('common.language')}</Text>
          <LanguageToggle size="sm" testID="profile-language" />
        </View>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          accessibilityRole="button"
          testID="profile-help"
        >
          <Text style={styles.rowLabel}>{t('profile.helpAndSupport')}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Button
        label={t('profile.logout')}
        variant="outline"
        onPress={() => void logout()}
        style={styles.logout}
        testID="profile-logout"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  name: {
    ...typography.title,
    color: colors.text,
  },
  guestCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  guestTitle: {
    ...typography.label,
    color: colors.text,
  },
  guestBody: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowLabel: {
    ...typography.body,
    color: colors.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  logout: {
    marginBottom: spacing.lg,
  },
});
