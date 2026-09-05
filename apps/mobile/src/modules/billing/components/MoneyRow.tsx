import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../ui';

type MoneyRowTone = 'default' | 'credit' | 'grand';

interface MoneyRowProps {
  label: string;
  /** EGP string; the currency suffix is added here. */
  amount: string;
  /** `credit` for money coming off the bill, `grand` for the final line. */
  tone?: MoneyRowTone;
  testID?: string;
}

/** One line of the Bill Review breakdown. */
export function MoneyRow({
  label,
  amount,
  tone = 'default',
  testID,
}: MoneyRowProps) {
  return (
    <View style={styles.row} testID={testID}>
      <Text style={[styles.label, tone === 'grand' && styles.grandLabel]}>
        {label}
      </Text>
      <Text
        style={[
          styles.amount,
          tone === 'credit' && styles.creditAmount,
          tone === 'grand' && styles.grandAmount,
        ]}
      >
        {tone === 'credit' ? `- ${amount}` : amount} EGP
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.body,
    color: colors.text,
    flexShrink: 1,
  },
  grandLabel: {
    ...typography.title,
    fontSize: 18,
    color: colors.text,
  },
  amount: {
    ...typography.money,
    color: colors.text,
  },
  creditAmount: {
    color: colors.success,
  },
  grandAmount: {
    ...typography.title,
    fontVariant: ['tabular-nums'],
    fontSize: 22,
    color: colors.primary,
  },
});
