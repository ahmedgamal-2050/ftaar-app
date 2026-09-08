import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, typography } from '../../../ui';
import type { PaymentStatus } from '../../../api/endpoints/payments';

interface PaymentStatusPillProps {
  status: PaymentStatus;
  testID?: string;
}

/**
 * A member's payment state, rendered identically for everyone who can see it.
 *
 * This exists as its own component because the product's whole collection
 * mechanism is social pressure: every member reads every other member's status
 * off the same roster, so "paid" must look the same on your row as on theirs.
 * A per-screen bespoke badge would let those two drift apart.
 */
export function PaymentStatusPill({ status, testID }: PaymentStatusPillProps) {
  const { t } = useTranslation();
  const tone = TONES[status];

  return (
    <View
      style={[styles.pill, { backgroundColor: tone.surface }]}
      testID={testID}
    >
      <View style={[styles.dot, { backgroundColor: tone.accent }]} />
      <Text style={[styles.label, { color: tone.accent }]}>
        {t(tone.labelKey)}
      </Text>
    </View>
  );
}

/**
 * `failed` is in the backend enum but no flow produces it today; it shares the
 * unpaid treatment so an unexpected value can never render as a blank pill.
 */
const TONES: Record<
  PaymentStatus,
  { accent: string; surface: string; labelKey: string }
> = {
  paid: {
    accent: colors.success,
    surface: colors.successSurface,
    labelKey: 'payments.statusPaid',
  },
  pending: {
    accent: colors.warning,
    surface: colors.warningSurface,
    labelKey: 'payments.statusPending',
  },
  unpaid: {
    accent: colors.danger,
    surface: colors.dangerSurface,
    labelKey: 'payments.statusUnpaid',
  },
  failed: {
    accent: colors.danger,
    surface: colors.dangerSurface,
    labelKey: 'payments.statusUnpaid',
  },
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  dot: { width: 6, height: 6, borderRadius: radius.pill },
  label: {
    ...typography.caption,
    fontFamily: typography.label.fontFamily,
    fontSize: 11,
  },
});
