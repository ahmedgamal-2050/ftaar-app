import React from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { notchInset } from '../insets';

interface ScreenProps {
  children: React.ReactNode;
  /**
   * Insets to reserve. Defaults to the sides and home indicator. The notch is
   * reserved by `SafeStackHeader` when a header is shown — pass
   * `HEADERLESS_EDGES` on screens with `headerShown: false`.
   */
  edges?: readonly Edge[];
  /** Wraps content in a ScrollView. Off by default so flex layouts stay flex. */
  scroll?: boolean;
  /** Vertically centres the content. */
  center?: boolean;
  /** Drops the default screen padding for full-bleed content. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const DEFAULT_EDGES: readonly Edge[] = ['left', 'right', 'bottom'];

/** Headerless screens (onboarding, LobbyRoom tabs) must reserve the notch. */
export const HEADERLESS_EDGES: readonly Edge[] = ['top', 'left', 'right', 'bottom'];

function insetPadding(edges: readonly Edge[], insets: { top: number; right: number; bottom: number; left: number }) {
  return {
    paddingTop: edges.includes('top') ? notchInset(insets.top) : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
  };
}

/**
 * The container every screen sits in: cream background, notch/home-indicator
 * insets from the spacing-safe edges, and the standard screen padding.
 */
export function Screen({
  children,
  edges = DEFAULT_EDGES,
  scroll = false,
  center = false,
  padded = true,
  style,
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const contentStyle = [padded && styles.padded, center && styles.centered, style];

  return (
    <View
      style={[styles.safeArea, insetPadding(edges, insets)]}
      testID={testID}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

/**
 * App-wide cream frame. The notch itself is reserved on `Screen` — native
 * stack screens ignore parent padding and draw edge-to-edge.
 */
export function SafeAppFrame({ children }: { children: React.ReactNode }) {
  return (
    <View testID="safe-app-frame" style={styles.safeArea}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  padded: {
    padding: spacing.xl,
  },
  centered: {
    justifyContent: 'center',
  },
});
