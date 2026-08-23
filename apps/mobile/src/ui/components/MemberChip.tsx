import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';
import { memberColor, memberInitials } from '../memberColor';

type MemberChipSize = 'sm' | 'md' | 'lg';

interface MemberChipProps {
  /** The person's display name — the only identity input this component takes. */
  name: string;
  size?: MemberChipSize;
  /** Renders the name next to the circle instead of the circle alone. */
  withName?: boolean;
  testID?: string;
}

const DIAMETER: Record<MemberChipSize, number> = {
  sm: 24,
  md: 32,
  lg: 48,
};

const INITIALS_SIZE: Record<MemberChipSize, number> = {
  sm: 10,
  md: 13,
  lg: 18,
};

/**
 * The app's only representation of a person. There is deliberately no image
 * prop: avatars are always a coloured circle of initials, so nobody has to
 * upload a photo and no screen has to handle a missing one.
 */
export function MemberChip({ name, size = 'md', withName = false, testID }: MemberChipProps) {
  const diameter = DIAMETER[size];

  const circle = (
    <View
      testID={testID ? `${testID}-circle` : undefined}
      style={[
        styles.circle,
        {
          width: diameter,
          height: diameter,
          borderRadius: radius.pill,
          backgroundColor: memberColor(name),
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: INITIALS_SIZE[size] }]} allowFontScaling={false}>
        {memberInitials(name)}
      </Text>
    </View>
  );

  if (!withName) {
    return (
      <View testID={testID} accessibilityLabel={name}>
        {circle}
      </View>
    );
  }

  return (
    <View style={styles.row} testID={testID} accessibilityLabel={name}>
      {circle}
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: typography.label.fontFamily,
    color: colors.onPrimary,
  },
  name: {
    ...typography.body,
    color: colors.text,
    flexShrink: 1,
  },
});
