import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../theme';
import { notchInset } from '../insets';

/**
 * JS header that reserves the notch itself. The native stack header draws
 * edge-to-edge on Android and ignores `headerTopInsetEnabled`, so the
 * status-bar inset has to live here — not on `Screen` under a header.
 */
export function SafeStackHeader({
  navigation,
  options,
  route,
  back,
}: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const title = options.title ?? route.name;

  return (
    <View
      testID="safe-stack-header"
      style={[
        styles.header,
        { paddingTop: notchInset(insets.top) + spacing.sm },
      ]}
    >
      <View style={styles.row}>
        {back ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.side}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.side} />
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.side} />
      </View>
    </View>
  );
}

export function safeStackScreenOptions() {
  return {
    header: (props: NativeStackHeaderProps) => <SafeStackHeader {...props} />,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background },
  };
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.background,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
});
