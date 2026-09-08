import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LobbyStackParamList } from '../../../navigation/types';
import {
  Button,
  ErrorBanner,
  LtrText,
  Screen,
  colors,
  radius,
  spacing,
  typography,
} from '../../../ui';
import { getApiError } from '../../../api/client';
import type { PaymentBoardMember } from '../../../api/endpoints/payments';
import { useLobbyByCode } from '../../lobby/hooks/useLobby';
import {
  settlementHoldouts,
  useClaimPayment,
  useConfirmPayment,
  useFinalisedBill,
  usePaymentBoard,
  useRejectPayment,
  useSettleLobby,
} from '../hooks/usePayments';
import { launchInstaPay, type PayLaunchResult } from '../instapay';
import { PaymentMemberRow } from '../components/PaymentMemberRow';
import { PaymentStatusPill } from '../components/PaymentStatusPill';
import { RejectClaimSheet } from '../components/RejectClaimSheet';

type Props = NativeStackScreenProps<LobbyStackParamList, 'PaymentBoard'>;

/** EGP strings compare wrong as floats; piastres are the safe unit. */
function toPiastres(egp: string): number {
  return Math.round(parseFloat(egp) * 100);
}

export function PaymentBoardScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { lobbyCode } = route.params;

  const lobbyQuery = useLobbyByCode(lobbyCode);
  const lobbyId = lobbyQuery.data?.id;
  const boardQuery = usePaymentBoard(lobbyCode, lobbyId);
  const billQuery = useFinalisedBill(lobbyCode, lobbyId);
  const board = boardQuery.data;

  const claim = useClaimPayment(lobbyCode, lobbyId ?? '');
  const confirm = useConfirmPayment(lobbyCode, lobbyId ?? '');
  const reject = useRejectPayment(lobbyCode, lobbyId ?? '');
  const settle = useSettleLobby(lobbyCode, lobbyId ?? '');

  const [payResult, setPayResult] = useState<PayLaunchResult | null>(null);
  const [rejecting, setRejecting] = useState<PaymentBoardMember | null>(null);

  // Settling makes the lobby read-only for everyone, not just whoever pressed
  // the button — so every member's poll lands them on the receipt.
  const isSettled = board?.status === 'settled';
  useEffect(() => {
    if (isSettled) {
      navigation.replace('LobbySettled', { lobbyCode });
    }
  }, [isSettled, lobbyCode, navigation]);

  const myShare = useMemo(
    () => billQuery.data?.members.find((m) => m.id === board?.you.memberId),
    [billQuery.data, board?.you.memberId],
  );

  const owes = board ? toPiastres(board.you.amountOwed) > 0 : false;
  const alreadyPaid = board?.you.paymentStatus === 'paid';
  const claimPending = board?.you.paymentStatus === 'pending';

  const onPay = useCallback(async () => {
    if (!board) return;
    const result = await launchInstaPay({
      handle: board.instaPayHandle,
      amount: board.you.amountOwed,
      clipboardText: t('payments.clipboardText', {
        handle: board.instaPayHandle ?? '',
        amount: board.you.amountOwed,
        code: lobbyCode,
      }),
    });
    setPayResult(result);
  }, [board, lobbyCode, t]);

  if (lobbyQuery.isLoading || boardQuery.isLoading) {
    return (
      <Screen testID="payment-board-screen">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (boardQuery.isError || !board) {
    return (
      <Screen testID="payment-board-screen">
        <View style={styles.center}>
          <Ionicons
            name="cloud-offline-outline"
            size={44}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>
            {boardQuery.isError
              ? getApiError(boardQuery.error).message
              : t('order.loadError')}
          </Text>
          <Button
            label={t('common.retry')}
            onPress={() => void boardQuery.refetch()}
            testID="payment-board-retry"
          />
        </View>
      </Screen>
    );
  }

  const holdouts =
    settlementHoldouts(settle.error).length > 0
      ? settlementHoldouts(settle.error)
      : board.waitingOn;

  const header = (
    <View style={styles.headerBlock}>
      {/* Collected-so-far is shown to everyone: the running total is what
          makes the remaining holdouts feel conspicuous. */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>{t('payments.collected')}</Text>
        <LtrText style={styles.summaryValue}>
          {t('payments.collectedOf', {
            collected: board.collected,
            total: board.grandTotal,
          })}
        </LtrText>
        {board.instaPayHandle && (
          <View style={styles.handleRow}>
            <Ionicons
              name="wallet-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text style={styles.handleLabel}>{t('payments.payTo')}</Text>
            <LtrText style={styles.handleValue} selectable>
              {board.instaPayHandle}
            </LtrText>
          </View>
        )}
      </View>

      <View style={styles.yourCard}>
        <Text style={styles.sectionTitle}>{t('payments.yourShare')}</Text>
        {myShare ? (
          <>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                {t('payments.itemsSubtotal')}
              </Text>
              <LtrText style={styles.breakdownValue}>
                {t('payments.currencyAmount', {
                  amount: myShare.itemsSubtotal,
                })}
              </LtrText>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                {t('payments.feesShare')}
              </Text>
              <LtrText style={styles.breakdownValue}>
                {t('payments.currencyAmount', { amount: myShare.feesShare })}
              </LtrText>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('payments.youOwe')}</Text>
              <LtrText style={styles.totalValue}>
                {t('payments.currencyAmount', { amount: board.you.amountOwed })}
              </LtrText>
            </View>
          </>
        ) : (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('payments.youOwe')}</Text>
            <LtrText style={styles.totalValue}>
              {t('payments.currencyAmount', { amount: board.you.amountOwed })}
            </LtrText>
          </View>
        )}

        {/* Nothing delivered means nothing owed — no pay button, and no
            "unpaid" badge implying otherwise. */}
        {!owes && (
          <View style={styles.nothingDue}>
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color={colors.success}
            />
            <Text style={styles.nothingDueText}>
              {t('payments.nothingDue')}
            </Text>
          </View>
        )}

        {owes && alreadyPaid && (
          <PaymentStatusPill status="paid" testID="your-status" />
        )}

        {owes && !alreadyPaid && (
          <View style={styles.payActions}>
            <Button
              label={t('payments.payWithInstaPay')}
              onPress={() => void onPay()}
              testID="payment-pay-button"
            />
            <Button
              label={
                claimPending
                  ? t('payments.claimAwaitingHost')
                  : t('payments.markAsPaid')
              }
              variant="outline"
              onPress={() => claim.mutate({})}
              loading={claim.isPending}
              disabled={claimPending}
              testID="payment-claim-button"
            />
            {claimPending && (
              <Text style={styles.hint}>{t('payments.claimPendingHint')}</Text>
            )}
          </View>
        )}

        {payResult?.kind === 'copied' && (
          <View style={styles.fallbackNotice} testID="payment-fallback-notice">
            <Text style={styles.fallbackTitle}>
              {t('payments.fallbackTitle')}
            </Text>
            <Text style={styles.fallbackBody}>
              {t('payments.fallbackBody')}
            </Text>
            <LtrText style={styles.fallbackDetail} selectable>
              {t('payments.clipboardText', {
                handle: board.instaPayHandle ?? '',
                amount: board.you.amountOwed,
                code: lobbyCode,
              })}
            </LtrText>
          </View>
        )}

        {payResult?.kind === 'no-handle' && (
          <ErrorBanner
            message={t('payments.noHandle')}
            testID="payment-no-handle"
          />
        )}

        {claim.isError && (
          <ErrorBanner message={getApiError(claim.error).message} />
        )}
      </View>

      <Text style={styles.rosterTitle}>{t('payments.everyoneTitle')}</Text>
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      {holdouts.length > 0 && (
        <View style={styles.waitingCard} testID="payment-waiting-on">
          <Ionicons name="time-outline" size={18} color={colors.warning} />
          <Text style={styles.waitingText}>
            {t('payments.waitingOn', {
              names: holdouts.join(t('payments.nameSeparator')),
            })}
          </Text>
        </View>
      )}
      {settle.isError && settlementHoldouts(settle.error).length === 0 && (
        <ErrorBanner message={getApiError(settle.error).message} />
      )}
      {board.you.isAdmin && (
        <Button
          label={t('payments.settleLobby')}
          onPress={() => settle.mutate()}
          loading={settle.isPending}
          testID="payment-settle-button"
        />
      )}
    </View>
  );

  return (
    <Screen padded={false} testID="payment-board-screen">
      <FlatList
        data={board.members}
        keyExtractor={(member) => member.id}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        renderItem={({ item }) => (
          <PaymentMemberRow
            member={item}
            isYou={item.id === board.you.memberId}
            hostActions={
              board.you.isAdmin
                ? {
                    onConfirm: () => confirm.mutate({ memberId: item.id }),
                    onReject: () => setRejecting(item),
                    busy: confirm.isPending || reject.isPending,
                  }
                : undefined
            }
          />
        )}
        contentContainerStyle={styles.listContent}
      />

      <RejectClaimSheet
        visible={rejecting !== null}
        memberName={rejecting?.displayName ?? ''}
        busy={reject.isPending}
        onCancel={() => setRejecting(null)}
        onSubmit={(note) => {
          if (rejecting) {
            reject.mutate({ memberId: rejecting.id, payload: { note } });
          }
          setRejecting(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  listContent: { paddingBottom: spacing.xxl },
  headerBlock: { gap: spacing.md, padding: spacing.lg },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  summaryLabel: { ...typography.caption, color: colors.textMuted },
  summaryValue: { ...typography.money, fontSize: 22, color: colors.text },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  handleLabel: { ...typography.caption, color: colors.textMuted },
  handleValue: {
    ...typography.label,
    fontSize: 14,
    color: colors.primary,
    flexShrink: 1,
  },
  yourCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: { ...typography.title, fontSize: 18, color: colors.text },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { ...typography.body, color: colors.textMuted },
  breakdownValue: { ...typography.money, color: colors.text },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  totalLabel: { ...typography.label, color: colors.text },
  totalValue: { ...typography.money, fontSize: 18, color: colors.primary },
  nothingDue: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nothingDueText: { ...typography.caption, color: colors.success },
  payActions: { gap: spacing.sm, marginTop: spacing.xs },
  hint: { ...typography.caption, color: colors.textMuted },
  fallbackNotice: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  fallbackTitle: { ...typography.label, fontSize: 14, color: colors.text },
  fallbackBody: { ...typography.caption, color: colors.textMuted },
  fallbackDetail: {
    ...typography.caption,
    color: colors.text,
    marginTop: spacing.xs,
  },
  rosterTitle: { ...typography.title, fontSize: 18, color: colors.text },
  footer: { padding: spacing.lg, gap: spacing.md },
  waitingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningSurface,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  waitingText: { ...typography.caption, color: colors.text, flexShrink: 1 },
});
