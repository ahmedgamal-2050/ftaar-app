import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, colors, spacing, typography } from '../../../ui';

interface TotalsFooterProps {
  label: string;
  /** EGP string. */
  amount: string;
  /** Optional second line, e.g. the same total at menu prices. */
  caption?: string;
  actionLabel: string;
  onAction: () => void;
  /** `outline` for actions that undo rather than advance, e.g. reopening. */
  actionVariant?: 'primary' | 'outline';
  actionDisabled?: boolean;
  actionLoading?: boolean;
  /** Sits above the action, e.g. what publishing the bill will do. */
  note?: string;
  testID?: string;
}

/**
 * The pinned summary bar both bill screens end in. It reserves the home
 * indicator itself: the screens beneath it are full-bleed lists, so `Screen`
 * can't own that inset without padding the list too.
 */
export function TotalsFooter({
  label,
  amount,
  caption,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  actionDisabled = false,
  actionLoading = false,
  note,
  testID,
}: TotalsFooterProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      testID={testID}
      style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
    >
      <View style={styles.totalRow}>
        <View style={styles.totalLabelCol}>
          <Text style={styles.label}>{label}</Text>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amount}>{amount}</Text>
          <Text style={styles.currency}>EGP</Text>
        </View>
      </View>
      <Button
        label={actionLabel}
        onPress={onAction}
        variant={actionVariant}
        disabled={actionDisabled}
        loading={actionLoading}
        testID={testID ? `${testID}-action` : undefined}
      />
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  totalLabelCol: { flexShrink: 1, gap: 2 },
  label: { ...typography.body, color: colors.text },
  caption: { ...typography.caption, color: colors.textMuted },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  amount: {
    ...typography.display,
    fontVariant: ['tabular-nums'],
    fontSize: 30,
    color: colors.text,
  },
  currency: { ...typography.caption, color: colors.textMuted },
  note: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
