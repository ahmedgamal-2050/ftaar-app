import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Button,
  LtrText,
  MemberChip,
  colors,
  fontFamily,
  radius,
  spacing,
  typography,
} from '../../../ui';
import type { PaymentBoardMember } from '../../../api/endpoints/payments';
import { PaymentStatusPill } from './PaymentStatusPill';

interface PaymentMemberRowProps {
  member: PaymentBoardMember;
  isYou: boolean;
  /**
   * Renders the confirm/reject pair when this member has a claim waiting.
   * Passed only for the host — but the backend is the actual gate, so a
   * member who somehow rendered these buttons would still be refused.
   */
  hostActions?: {
    onConfirm: () => void;
    onReject: () => void;
    busy: boolean;
  };
}

/**
 * One person's line on the payment board: who they are, what they owe, and
 * where their payment stands. Every member sees this row for every other
 * member — that mutual visibility is the product's collection mechanism, so
 * the row never hides a status based on who is looking.
 *
 * Derived from the Group tab's member card so the two rosters read as the
 * same list with different trailing content.
 */
export function PaymentMemberRow({
  member,
  isYou,
  hostActions,
}: PaymentMemberRowProps) {
  const { t } = useTranslation();
  const showHostActions = !!hostActions && member.pendingClaimId !== null;

  return (
    <View style={styles.card} testID={`payment-member-${member.id}`}>
      <View style={styles.mainRow}>
        <MemberChip name={member.displayName} size="md" />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {member.displayName}
              {isYou ? ` (${t('order.you')})` : ''}
            </Text>
            {member.role === 'admin' && (
              <View style={styles.hostBadge}>
                <Text style={styles.hostBadgeText}>{t('order.host')}</Text>
              </View>
            )}
          </View>
          <PaymentStatusPill
            status={member.paymentStatus}
            testID={`payment-status-${member.id}`}
          />
        </View>
        <LtrText style={styles.amount}>
          {t('payments.currencyAmount', { amount: member.total })}
        </LtrText>
      </View>

      {showHostActions && (
        <View style={styles.actions}>
          <Button
            label={t('payments.reject')}
            variant="outline"
            size="sm"
            onPress={hostActions.onReject}
            disabled={hostActions.busy}
            style={styles.action}
            testID={`payment-reject-${member.id}`}
          />
          <Button
            label={t('payments.confirm')}
            size="sm"
            onPress={hostActions.onConfirm}
            disabled={hostActions.busy}
            style={styles.action}
            testID={`payment-confirm-${member.id}`}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  mainRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: {
    ...typography.label,
    color: colors.text,
    fontSize: 15,
    flexShrink: 1,
  },
  hostBadge: {
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  hostBadgeText: {
    ...typography.caption,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    fontSize: 10,
  },
  amount: { ...typography.money, color: colors.primary, fontSize: 15 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
