import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme';
import { Screen } from './Screen';

interface ScreenPlaceholderProps {
  /** The route name, so it is obvious which node of the tree is on screen. */
  name: string;
  description?: string;
  edges?: readonly Edge[];
  children?: React.ReactNode;
}

/**
 * Stands in for a screen that is wired into navigation but not yet built.
 * Every route in the tree resolves to something on screen, so feature work can
 * start on any branch without waiting for a route to exist.
 */
export function ScreenPlaceholder({
  name,
  description,
  edges,
  children,
}: ScreenPlaceholderProps) {
  return (
    <Screen scroll center edges={edges} testID={`screen-${name}`}>
      <Text style={styles.name} testID={`placeholder-${name}`}>
        {name}
      </Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children ? <View style={styles.content}>{children}</View> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: {
    ...typography.title,
    color: colors.text,
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  content: {
    marginTop: spacing.lg,
  },
});
