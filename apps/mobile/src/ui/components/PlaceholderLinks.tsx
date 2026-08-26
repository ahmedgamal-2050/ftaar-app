import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

export interface PlaceholderLink {
  label: string;
  onPress: () => void;
}

interface PlaceholderLinksProps {
  links: readonly PlaceholderLink[];
}

/**
 * Navigation affordances on a placeholder screen. Their only job is to keep
 * deeper routes reachable by tapping through the app while the real entry
 * points (a restaurant row, a lobby card) do not exist yet.
 */
export function PlaceholderLinks({ links }: PlaceholderLinksProps) {
  return (
    <View style={styles.container}>
      {links.map((link) => (
        <TouchableOpacity
          key={link.label}
          style={styles.link}
          onPress={link.onPress}
        >
          <Text style={styles.label}>{link.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  link: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.primary,
  },
});
