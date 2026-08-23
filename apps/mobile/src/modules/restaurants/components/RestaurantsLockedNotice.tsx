import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { colors, radius, spacing, typography } from '../../../ui';

/**
 * Read-only face of the Restaurants tab for guests. It is a state of
 * RestaurantList, not its own route — every restaurant screen stays registered.
 */
export function RestaurantsLockedNotice() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <>
      <Text style={styles.title}>Restaurants are read-only for guests</Text>
      <Text style={styles.subtitle}>Create an account to add restaurants and manage their menus.</Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() =>
          navigation.navigate('MainTabs', {
            screen: 'Profile',
            params: { screen: 'Register' },
          })
        }
      >
        <Text style={styles.primaryButtonLabel}>Create an account</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonLabel: {
    ...typography.label,
    color: colors.onPrimary,
  },
});
