import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { randomUUID } from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LobbyStackParamList } from '../../../navigation/types';
import {
  ErrorBanner,
  MemberChip,
  Screen,
  colors,
  fontFamily,
  radius,
  spacing,
  typography,
} from '../../../ui';
import { getApiError } from '../../../api/client';
import type {
  BillFees,
  BillMemberBalance,
} from '../../../api/endpoints/billing';
import { useCurrentMember, useLobbyByCode } from '../../lobby/hooks/useLobby';
import {
  useBillPreview,
  useFinaliseBill,
  useFinalisedBill,
  useReopenBill,
} from '../hooks/useBill';
import { BILLED_STATUS } from '../status';
import { MoneyRow } from '../components/MoneyRow';
import { TotalsFooter } from '../components/TotalsFooter';

type Props = NativeStackScreenProps<LobbyStackParamList, 'BillReview'>;

/** Only ever read while the query is disabled — preview needs *some* fees. */
const NO_FEES: BillFees = {
  deliveryFee: '0.00',
  serviceFee: '0.00',
  discount: '0.00',
  receiptTotal: null,
};

function MemberRow({
  member,
  isYou,
}: {
  member: BillMemberBalance;
  isYou: boolean;
}) {
  const { t } = useTranslation();

  return (
    <View style={memberStyles.card}>
      <MemberChip name={member.displayName} size="md" />
      <View style={memberStyles.info}>
        <Text style={memberStyles.name} numberOfLines={1}>
          {member.displayName}
          {isYou ? ` (${t('order.you')})` : ''}
        </Text>
        <Text style={memberStyles.detail} numberOfLines={1}>
          {t('billing.memberBreakdownDetail', {
            items: member.itemsSubtotal,
            fees: member.feesShare,
          })}
        </Text>
      </View>
      <Text style={memberStyles.amount}>{member.total} EGP</Text>
    </View>
  );
}

const memberStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  info: { flex: 1, gap: 2 },
  name: { ...typography.label, color: colors.text, fontSize: 15 },
  detail: { ...typography.caption, color: colors.textMuted },
  amount: { ...typography.money, color: colors.primary, fontSize: 15 },
});

export function BillReviewScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { lobbyCode, fees } = route.params;

  const lobbyQuery = useLobbyByCode(lobbyCode);
  const lobby = lobbyQuery.data;
  const currentMember = useCurrentMember(lobby);
  const isAdmin = currentMember?.role === 'admin';
  const isPublished = lobby?.status === BILLED_STATUS;

  const previewQuery = useBillPreview(
    lobbyCode,
    lobby?.id,
    fees ?? NO_FEES,
    !!fees && !!isAdmin && !isPublished,
  );
  const billQuery = useFinalisedBill(lobbyCode, lobby?.id, !!isPublished);

  const finalise = useFinaliseBill(lobbyCode, lobby?.id ?? '');
  const reopen = useReopenBill(lobbyCode, lobby?.id ?? '');

  // One key for the life of this screen, so a retried tap after a dropped
  // response returns the bill that already exists instead of a CONFLICT.
  const idempotencyKey = useRef(randomUUID());
  const [error, setError] = useState<string | undefined>();

  const invariant = isPublished ? billQuery.data : previewQuery.data;
  const activeQuery = isPublished ? billQuery : previewQuery;

  async function handleFinalise() {
    if (!fees) {
      return;
    }
    try {
      await finalise.mutateAsync({
        fees,
        idempotencyKey: idempotencyKey.current,
      });
      setError(undefined);
      navigation.navigate('PaymentBoard', { lobbyCode });
    } catch (err) {
      setError(getApiError(err).message || t('billing.finalizeError'));
    }
  }

  function handleReopen() {
    Alert.alert(
      t('billing.reopenConfirmTitle'),
      t('billing.reopenConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('billing.reopenConfirmAction'),
          style: 'destructive',
          onPress: () => {
            reopen.mutate(undefined, {
              onSuccess: () => {
                setError(undefined);
                navigation.navigate('BillEntry', { lobbyCode });
              },
              onError: (err) => {
                const { code, message } = getApiError(err);
                setError(
                  code === 'BILL_LOCKED'
                    ? t('billing.reopenLocked')
                    : message || t('billing.reopenError'),
                );
              },
            });
          },
        },
      ],
    );
  }

  // ── Gates ──────────────────────────────────────────────────────────────────

  if (lobbyQuery.isLoading || activeQuery.isLoading) {
    return (
      <Screen testID="bill-review-screen">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (lobbyQuery.isError || !lobby) {
    return (
      <Screen testID="bill-review-screen">
        <View style={styles.center}>
          <Ionicons
            name="cloud-offline-outline"
            size={44}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>{t('billing.loadError')}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void lobbyQuery.refetch()}
          >
            <Text style={styles.retryLabel}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen testID="bill-review-screen">
        <View style={styles.center}>
          <Ionicons
            name="lock-closed-outline"
            size={44}
            color={colors.textMuted}
          />
          <Text style={styles.emptyTitle}>{t('billing.hostOnlyTitle')}</Text>
          <Text style={styles.emptyText}>{t('billing.hostOnlyBody')}</Text>
        </View>
      </Screen>
    );
  }

  // Reached without charges and with nothing published — there is nothing to
  // review, so send the host back to enter them.
  if (!invariant) {
    return (
      <Screen testID="bill-review-screen">
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={44} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            {activeQuery.isError
              ? t('billing.loadError')
              : t('billing.notArrivedBody')}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => navigation.navigate('BillEntry', { lobbyCode })}
          >
            <Text style={styles.retryLabel}>{t('lobby.billEntryTitle')}</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  // ── Review ─────────────────────────────────────────────────────────────────

  const { reconciliation } = invariant;

  return (
    <View style={styles.flex} testID="bill-review-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.restaurantCard}>
          <View style={styles.restaurantIcon}>
            <Ionicons name="storefront" size={20} color={colors.primary} />
          </View>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {lobby.restaurant?.name ?? ''}
            </Text>
            <Text style={styles.restaurantCaption}>
              {isPublished
                ? t('billing.published')
                : t('billing.reviewSubtitle')}
            </Text>
          </View>
        </View>

        {error ? (
          <ErrorBanner message={error} testID="bill-review-error" />
        ) : null}

        {reconciliation.warns && reconciliation.receiptTotal ? (
          <View style={styles.warnBanner}>
            <Ionicons name="warning" size={18} color={colors.warning} />
            <Text style={styles.warnText}>
              {t('billing.receiptMismatch', {
                receipt: reconciliation.receiptTotal,
                computed: reconciliation.computedTotal,
              })}
            </Text>
          </View>
        ) : null}

        <View style={styles.breakdownCard}>
          <MoneyRow
            label={t('billing.itemsSubtotal')}
            amount={invariant.subtotal}
            testID="bill-subtotal"
          />
          <MoneyRow
            label={t('billing.deliveryFee')}
            amount={invariant.deliveryFee}
          />
          <MoneyRow
            label={t('billing.serviceFee')}
            amount={invariant.serviceFee}
          />
          <MoneyRow label={t('billing.tax')} amount={invariant.tax} />
          <MoneyRow
            label={t('billing.groupDiscount')}
            amount={invariant.discount}
            tone="credit"
          />
          <View style={styles.divider} />
          <MoneyRow
            label={t('billing.grandTotal')}
            amount={invariant.total}
            tone="grand"
            testID="bill-grand-total"
          />
        </View>

        <Text style={styles.sectionTitle}>{t('billing.memberBreakdown')}</Text>
        {invariant.members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isYou={member.id === currentMember?.id}
          />
        ))}
      </ScrollView>

      {isPublished ? (
        <TotalsFooter
          label={t('billing.grandTotal')}
          amount={invariant.total}
          actionLabel={t('billing.reopen')}
          actionVariant="outline"
          onAction={handleReopen}
          actionLoading={reopen.isPending}
          testID="bill-review-footer"
        />
      ) : (
        <TotalsFooter
          label={t('billing.grandTotal')}
          amount={invariant.total}
          actionLabel={t('billing.finalize')}
          onAction={() => void handleFinalise()}
          actionLoading={finalise.isPending}
          note={t('billing.finalizeNote')}
          testID="bill-review-footer"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: { ...typography.label, color: colors.text, fontSize: 16 },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  retryLabel: { ...typography.label, color: colors.onPrimary },
  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  restaurantIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantInfo: { flex: 1, gap: 2 },
  restaurantName: { ...typography.title, fontSize: 18, color: colors.text },
  restaurantCaption: { ...typography.caption, color: colors.textMuted },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  warnText: { ...typography.caption, color: colors.text, flexShrink: 1 },
  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  sectionTitle: {
    ...typography.caption,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
  },
});
