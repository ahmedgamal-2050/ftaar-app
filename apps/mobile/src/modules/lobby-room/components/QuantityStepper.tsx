import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../ui';

interface QuantityStepperProps {
  qty: number;
  onIncrement: () => void;
  /** Decrementing from 1 removes the item — the caller decides that, this
   * component just reports the tap. */
  onDecrement: () => void;
  disabled?: boolean;
  testID?: string;
}

/** Zero renders as a plain "Add" pill; any positive quantity renders the
 * usual [-  qty  +] stepper. Used on both the Menu (adding) and Cart
 * (editing) tabs so the same tap targets behave identically everywhere. */
export function QuantityStepper({
  qty,
  onIncrement,
  onDecrement,
  disabled = false,
  testID,
}: QuantityStepperProps) {
  if (qty <= 0) {
    return (
      <TouchableOpacity
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel="Add item"
        onPress={onIncrement}
        disabled={disabled}
        style={[styles.addPill, disabled && styles.disabled]}
      >
        <Ionicons name="add" size={16} color={colors.onPrimary} />
        <Text style={styles.addLabel}>Add</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View testID={testID} style={[styles.stepper, disabled && styles.disabled]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        onPress={onDecrement}
        disabled={disabled}
        style={styles.stepBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="remove" size={16} color={colors.primary} />
      </TouchableOpacity>
      <Text style={styles.qty}>{qty}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        onPress={onIncrement}
        disabled={disabled}
        style={styles.stepBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="add" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  addLabel: {
    ...typography.caption,
    fontFamily: typography.label.fontFamily,
    color: colors.onPrimary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  stepBtn: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  qty: {
    ...typography.money,
    color: colors.text,
    minWidth: 20,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
