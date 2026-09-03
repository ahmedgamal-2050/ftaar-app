import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { KeyboardTypeOptions } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  /** Adds an eye-toggle so the field can hide/reveal its value. */
  secureTextEntry?: boolean;
  /** Non-interactive display, e.g. the "carried over" display name on
   * Register — styled dimmer rather than disabled-looking. */
  editable?: boolean;
  error?: string;
  helperText?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  testID?: string;
}

/** The app's only text-input shape. Every form field (name, email, password)
 * goes through this rather than a bare `TextInput` per screen. */
export function TextField({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  secureTextEntry = false,
  editable = true,
  error,
  helperText,
  keyboardType,
  autoCapitalize,
  maxLength,
  testID,
}: TextFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const hidesText = secureTextEntry && !revealed;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          !editable && styles.inputRowDisabled,
          !!error && styles.inputRowError,
        ]}
      >
        <TextInput
          testID={testID}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidesText}
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize={
            autoCapitalize ?? (secureTextEntry ? 'none' : 'sentences')
          }
          autoCorrect={false}
          maxLength={maxLength}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setRevealed((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={8}
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  inputRowDisabled: {
    backgroundColor: colors.background,
  },
  inputRowError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
  helperText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
