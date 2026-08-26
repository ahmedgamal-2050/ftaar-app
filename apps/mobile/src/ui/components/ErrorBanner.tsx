import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

interface ErrorBannerProps {
  message: string;
  testID?: string;
}

/** Inline form-level error, e.g. Login's "Email or password is incorrect". */
export function ErrorBanner({ message, testID }: ErrorBannerProps) {
  return (
    <View style={styles.container} testID={testID}>
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSurface,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.caption,
    color: colors.danger,
    flexShrink: 1,
  },
});
