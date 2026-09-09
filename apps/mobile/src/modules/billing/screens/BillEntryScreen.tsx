import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LobbyStackParamList } from '../../../navigation/types';
import {
  Button,
  ErrorBanner,
  Screen,
  TextField,
  colors,
  fontFamily,
  radius,
  spacing,
  typography,
} from '../../../ui';
import { getApiError } from '../../../api/client';
import type { BillDraftGroup, BillFees } from '../../../api/endpoints/billing';
import { useCurrentMember, useLobbyByCode } from '../../lobby/hooks/useLobby';
import { useBillDraft, usePatchBillLines } from '../hooks/useBill';
import type { BillEdits } from '../billDraft';
import {
  allPatches,
  groupPatch,
  initialEdits,
  referencePiastres,
  subtotalPiastres,
  unpricedItemNames,
} from '../billDraft';
import { fromPiastres, piastresOf } from '../money';
import { ARRIVED_STATUS, BILLED_STATUS } from '../status';
import { BillItemCard } from '../components/BillItemCard';
import { TotalsFooter } from '../components/TotalsFooter';

type Props = NativeStackScreenProps<LobbyStackParamList, 'BillEntry'>;

interface FeeFields {
  deliveryFee: string;
  serviceFee: string;
  discount: string;
  receiptTotal: string;
}

const EMPTY_FEES: FeeFields = {
  deliveryFee: '',
  serviceFee: '',
  discount: '',
  receiptTotal: '',
};

/** A blank charge is zero; a blank receipt total means "didn't check", which
 * the backend reads as "nothing to reconcile against". */
function toBillFees(fields: FeeFields): BillFees {
  return {
    deliveryFee: fromPiastres(piastresOf(fields.deliveryFee)),
    serviceFee: fromPiastres(piastresOf(fields.serviceFee)),
    discount: fromPiastres(piastresOf(fields.discount)),
    receiptTotal: fields.receiptTotal
      ? fromPiastres(piastresOf(fields.receiptTotal))
      : null,
  };
}

export function BillEntryScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { lobbyCode } = route.params;

  const lobbyQuery = useLobbyByCode(lobbyCode);
  const lobby = lobbyQuery.data;
  const currentMember = useCurrentMember(lobby);
  const isAdmin = currentMember?.role === 'admin';
  const hasArrived = lobby?.status === ARRIVED_STATUS;

  const draftQuery = useBillDraft(
    lobbyCode,
    lobby?.id,
    !!isAdmin && hasArrived,
  );
  const draft = draftQuery.data;
  const patchLines = usePatchBillLines(lobbyCode, lobby?.id ?? '');

  const [edits, setEdits] = useState<BillEdits | null>(null);
  const [fees, setFees] = useState<FeeFields>(EMPTY_FEES);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  // Seeded once. Every later draft in the cache is a response to our own
  // PATCH, and re-seeding from it would fight whatever the host is typing.
  useEffect(() => {
    if (draft && edits === null) {
      setEdits(initialEdits(draft));
    }
  }, [draft, edits]);

  const memberNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const member of draft?.members ?? []) {
      names[member.id] = member.displayName;
    }
    return names;
  }, [draft]);

  const save = useCallback(
    (group: BillDraftGroup, next: BillEdits) => {
      patchLines.mutate(
        { lines: groupPatch(group, next[group.menuItemId]) },
        {
          onSuccess: () => setError(undefined),
          onError: (err) =>
            setError(getApiError(err).message || t('billing.saveError')),
        },
      );
    },
    [patchLines, t],
  );

  const handleChangePrice = useCallback((menuItemId: string, price: string) => {
    setFocusedItemId(menuItemId);
    setEdits((prev) =>
      prev ? { ...prev, [menuItemId]: { ...prev[menuItemId], price } } : prev,
    );
  }, []);

  const handleToggleDelivered = useCallback(
    (group: BillDraftGroup, lineId: string) => {
      setEdits((prev) => {
        if (!prev) {
          return prev;
        }
        const current = prev[group.menuItemId];
        const next: BillEdits = {
          ...prev,
          [group.menuItemId]: {
            ...current,
            delivered: {
              ...current.delivered,
              [lineId]: !current.delivered[lineId],
            },
          },
        };
        save(group, next);
        return next;
      });
    },
    [save],
  );

  const totals = useMemo(() => {
    if (!draft || !edits) {
      return { total: '0.00', reference: '0.00' };
    }
    const netFees =
      piastresOf(fees.deliveryFee) +
      piastresOf(fees.serviceFee) -
      piastresOf(fees.discount);
    return {
      total: fromPiastres(subtotalPiastres(draft, edits) + netFees),
      reference: fromPiastres(referencePiastres(draft, edits)),
    };
  }, [draft, edits, fees]);

  async function handleReview() {
    if (!draft || !edits) {
      return;
    }
    const missing = unpricedItemNames(draft, edits);
    if (missing.length > 0) {
      setError(t('billing.pricesIncomplete', { items: missing.join(', ') }));
      return;
    }
    try {
      // Flush everything rather than trusting the per-field saves: a price
      // typed and then reviewed without blurring has never been sent.
      await patchLines.mutateAsync({ lines: allPatches(draft, edits) });
      setError(undefined);
      navigation.navigate('BillReview', { lobbyCode, fees: toBillFees(fees) });
    } catch (err) {
      setError(getApiError(err).message || t('billing.saveError'));
    }
  }

  // ── Gates ──────────────────────────────────────────────────────────────────

  if (lobbyQuery.isLoading || (isAdmin && hasArrived && draftQuery.isLoading)) {
    return (
      <Screen testID="bill-entry-screen">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (lobbyQuery.isError || !lobby) {
    return (
      <Screen testID="bill-entry-screen">
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
      <Screen testID="bill-entry-screen">
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

  // Already published — the numbers live on the bill now, not in this form.
  if (lobby.status === BILLED_STATUS) {
    return (
      <Screen testID="bill-entry-screen">
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={44} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('billing.published')}</Text>
          <Button
            label={t('billing.reviewBill')}
            onPress={() => navigation.navigate('BillReview', { lobbyCode })}
            style={styles.gateButton}
          />
        </View>
      </Screen>
    );
  }

  if (!hasArrived) {
    return (
      <Screen testID="bill-entry-screen">
        <View style={styles.center}>
          <Ionicons name="time-outline" size={44} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('billing.notArrivedTitle')}</Text>
          <Text style={styles.emptyText}>{t('billing.notArrivedBody')}</Text>
        </View>
      </Screen>
    );
  }

  if (draftQuery.isError || !draft || !edits) {
    return (
      <Screen testID="bill-entry-screen">
        <View style={styles.center}>
          <Ionicons
            name="cloud-offline-outline"
            size={44}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>{t('billing.loadError')}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void draftQuery.refetch()}
          >
            <Text style={styles.retryLabel}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  if (draft.groups.length === 0) {
    return (
      <Screen testID="bill-entry-screen">
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={44} color={colors.textMuted} />
          <Text style={styles.emptyText}>{t('billing.empty')}</Text>
        </View>
      </Screen>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID="bill-entry-screen"
    >
      <FlatList
        data={draft.groups}
        keyExtractor={(group) => group.menuItemId}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('billing.entrySubtitle')}</Text>
            <Text style={styles.headerSubtitle}>
              {lobby.restaurant?.name ?? ''}
            </Text>
            {error ? (
              <ErrorBanner message={error} testID="bill-entry-error" />
            ) : null}
            <Text style={styles.sectionTitle}>{t('billing.orderedItems')}</Text>
          </View>
        }
        renderItem={({ item: group }) => (
          <BillItemCard
            group={group}
            edit={edits[group.menuItemId]}
            memberNames={memberNames}
            focused={focusedItemId === group.menuItemId}
            onChangePrice={(price) =>
              handleChangePrice(group.menuItemId, price)
            }
            onCommit={() => save(group, edits)}
            onToggleDelivered={(lineId) => handleToggleDelivered(group, lineId)}
          />
        )}
        ListFooterComponent={
          <View style={styles.charges}>
            <Text style={styles.sectionTitle}>
              {t('billing.additionalCharges')}
            </Text>
            <View style={styles.chargeRow}>
              <View style={styles.chargeField}>
                <TextField
                  label={t('billing.deliveryFee')}
                  value={fees.deliveryFee}
                  onChangeText={(deliveryFee) =>
                    setFees((prev) => ({ ...prev, deliveryFee }))
                  }
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  testID="bill-delivery-fee"
                />
              </View>
              <View style={styles.chargeField}>
                <TextField
                  label={t('billing.serviceFee')}
                  value={fees.serviceFee}
                  onChangeText={(serviceFee) =>
                    setFees((prev) => ({ ...prev, serviceFee }))
                  }
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  testID="bill-service-fee"
                />
              </View>
            </View>
            <View style={styles.chargeRow}>
              <View style={styles.chargeField}>
                <TextField
                  label={t('billing.discount')}
                  value={fees.discount}
                  onChangeText={(discount) =>
                    setFees((prev) => ({ ...prev, discount }))
                  }
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  testID="bill-discount"
                />
              </View>
              <View style={styles.chargeField} />
            </View>
            <TextField
              label={t('billing.receiptTotal')}
              value={fees.receiptTotal}
              onChangeText={(receiptTotal) =>
                setFees((prev) => ({ ...prev, receiptTotal }))
              }
              placeholder="0.00"
              keyboardType="decimal-pad"
              helperText={t('billing.receiptTotalHelper')}
              testID="bill-receipt-total"
            />
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      <TotalsFooter
        label={t('billing.runningTotal')}
        amount={totals.total}
        caption={t('billing.referenceCaption', { amount: totals.reference })}
        actionLabel={t('billing.reviewBill')}
        onAction={() => void handleReview()}
        actionLoading={patchLines.isPending}
        testID="bill-entry-footer"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
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
  gateButton: { alignSelf: 'stretch', marginTop: spacing.sm },
  retryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  retryLabel: { ...typography.label, color: colors.onPrimary },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  headerTitle: { ...typography.title, fontSize: 20, color: colors.text },
  headerSubtitle: { ...typography.caption, color: colors.textMuted },
  sectionTitle: {
    ...typography.caption,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
  },
  charges: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  chargeRow: { flexDirection: 'row', gap: spacing.md },
  chargeField: { flex: 1 },
  listContent: { paddingBottom: spacing.xl },
});
