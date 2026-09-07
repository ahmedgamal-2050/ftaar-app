import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../ui';
import { isValidEgp } from '../money';

interface PriceInputProps {
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  editable?: boolean;
  accessibilityLabel: string;
  testID?: string;
}

/**
 * The bill screens' money field: a bordered box holding a right-aligned,
 * tabular-figure amount, so a column of them lines up on the decimal point.
 * Turns red the moment the text stops being a valid EGP amount rather than
 * waiting for a submit — the host is typing against a live total.
 */
export function PriceInput({
  value,
  onChangeText,
  onBlur,
  placeholder = '0.00',
  editable = true,
  accessibilityLabel,
  testID,
}: PriceInputProps) {
  const invalid = value.length > 0 && !isValidEgp(value);

  return (
    <View
      style={[
        styles.box,
        !editable && styles.boxDisabled,
        invalid && styles.boxInvalid,
      ]}
    >
      <TextInput
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
        editable={editable}
        selectTextOnFocus
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    minWidth: 96,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
  },
  boxDisabled: {
    backgroundColor: colors.background,
  },
  boxInvalid: {
    borderColor: colors.danger,
  },
  input: {
    ...typography.money,
    color: colors.text,
    textAlign: 'right',
    padding: 0,
  },
});
