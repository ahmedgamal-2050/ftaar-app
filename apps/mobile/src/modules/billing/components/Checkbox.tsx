import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../ui';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
  testID?: string;
}

/** Square check control for the bill screens' "Not delivered" flags — the
 * app's other toggles are all steppers or pills, neither of which reads as a
 * flag you set once. */
export function Checkbox({ label, checked, onToggle, testID }: CheckboxProps) {
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onToggle}
      style={styles.row}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? (
          <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
        ) : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
