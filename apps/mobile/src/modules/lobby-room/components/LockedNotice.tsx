import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { LobbyStatus } from '../../../api/endpoints/lobbies';
import { colors, radius, spacing, typography } from '../../../ui';

/** Every non-open status reads as "closed for ordering" — the copy just
 * explains which stage the lobby is in. Callers only render this once
 * `status !== 'open'`, but the prop stays the full union so call sites don't
 * need to fight TS narrowing over a field read a moment earlier. */
const REASON_KEY: Record<LobbyStatus, string> = {
  open: 'order.lockedLocked',
  locked: 'order.lockedLocked',
  billed: 'order.lockedBilled',
  settled: 'order.lockedSettled',
  cancelled: 'order.lockedCancelled',
};

interface LockedNoticeProps {
  status: LobbyStatus;
  testID?: string;
}

/** Shown instead of edit controls once a lobby leaves the `open` state — a
 * persistent explanation, not a silently greyed-out button. */
export function LockedNotice({ status, testID }: LockedNoticeProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container} testID={testID}>
      <Ionicons name="lock-closed" size={18} color={colors.textMuted} />
      <Text style={styles.text}>{t(REASON_KEY[status])}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    margin: spacing.lg,
  },
  text: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 1,
  },
});
