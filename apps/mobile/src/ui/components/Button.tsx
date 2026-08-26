import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

type ButtonVariant = 'primary' | 'outline';
type ButtonSize = 'md' | 'sm';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** `sm` covers compact placements like the Profile language pills. */
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** The app's only tappable-action shape — every screen's primary/secondary
 * CTA and the language pills go through this rather than a bespoke
 * TouchableOpacity per screen. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.base,
        size === 'sm' && styles.baseSm,
        variant === 'primary' ? styles.primary : styles.outline,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.onPrimary : colors.primary}
        />
      ) : (
        <Text
          style={[
            size === 'sm' ? styles.labelSm : styles.label,
            variant === 'primary' ? styles.primaryLabel : styles.outlineLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  baseSm: {
    minHeight: 36,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.label,
  },
  labelSm: {
    ...typography.caption,
    fontFamily: typography.label.fontFamily,
  },
  primaryLabel: {
    color: colors.onPrimary,
  },
  outlineLabel: {
    color: colors.text,
  },
});
