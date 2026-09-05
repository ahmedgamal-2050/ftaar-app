import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { BillDraftGroup } from '../../../api/endpoints/billing';
import { colors, fontFamily, radius, spacing, typography } from '../../../ui';
import type { GroupEdit } from '../billDraft';
import {
  deliveredQty,
  perItemDeltaPiastres,
  referenceTotalPiastres,
} from '../billDraft';
import { fromPiastres } from '../money';
import { Checkbox } from './Checkbox';
import { PriceInput } from './PriceInput';

interface BillItemCardProps {
  group: BillDraftGroup;
  edit: GroupEdit;
  /** Display name per `lobbyMemberId`, for the per-member rows. */
  memberNames: Record<string, string>;
  focused: boolean;
  onChangePrice: (price: string) => void;
  onCommit: () => void;
  onToggleDelivered: (lineId: string) => void;
}

/**
 * One menu item on the Bill Entry screen. The host prices the item as a
 * whole — that's what the receipt shows — and the screen splits that total
 * back across the people who ordered it. When more than one person did, each
 * gets their own row so a single missing portion can be marked undelivered
 * without dropping everyone else's.
 */
export function BillItemCard({
  group,
  edit,
  memberNames,
  focused,
  onChangePrice,
  onCommit,
  onToggleDelivered,
}: BillItemCardProps) {
  const { t } = useTranslation();

  const qty = deliveredQty(group, edit);
  const allUndelivered = qty === 0;
  const delta = perItemDeltaPiastres(group, edit);
  const referenceTotal = fromPiastres(referenceTotalPiastres(group, edit));
  const perMember = group.lines.length > 1;

  return (
    <View style={[styles.card, focused && styles.cardFocused]}>
      <View style={styles.headRow}>
        <View style={styles.nameCol}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, allUndelivered && styles.nameStruck]}
              numberOfLines={2}
            >
              {group.name}
            </Text>
            <View style={styles.qtyBadge}>
              <Text style={styles.qtyBadgeText}>×{qty}</Text>
            </View>
          </View>
          <Text style={styles.reference}>
            {t('billing.reference', { amount: referenceTotal })}
          </Text>
        </View>
        <PriceInput
          value={edit.price}
          onChangeText={onChangePrice}
          onBlur={onCommit}
          editable={!allUndelivered}
          accessibilityLabel={t('billing.priceFor', { item: group.name })}
          testID={`bill-price-${group.menuItemId}`}
        />
      </View>

      {delta !== null && !allUndelivered ? (
        <View style={styles.deltaRow}>
          <Ionicons
            name="warning-outline"
            size={14}
            color={colors.warning}
            // The amount already carries the sign; the icon reads as "check
            // this", not as "over".
          />
          <Text style={styles.deltaText}>
            {delta > 0
              ? t('billing.morePerItem', { amount: fromPiastres(delta) })
              : t('billing.lessPerItem', { amount: fromPiastres(-delta) })}
          </Text>
        </View>
      ) : null}

      {perMember ? (
        <View style={styles.memberRows}>
          {group.lines.map((line) => (
            <View key={line.id} style={styles.memberRow}>
              <Checkbox
                label={t('billing.notDeliveredFor', {
                  name: memberNames[line.memberId] ?? t('billing.someone'),
                  qty: line.qty,
                })}
                checked={!edit.delivered[line.id]}
                onToggle={() => onToggleDelivered(line.id)}
                testID={`bill-undelivered-${line.id}`}
              />
            </View>
          ))}
        </View>
      ) : (
        <Checkbox
          label={t('billing.notDelivered')}
          checked={!edit.delivered[group.lines[0].id]}
          onToggle={() => onToggleDelivered(group.lines[0].id)}
          testID={`bill-undelivered-${group.lines[0].id}`}
        />
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
  cardFocused: {
    borderColor: colors.primary,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  nameCol: { flex: 1, gap: 2 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  name: {
    ...typography.label,
    color: colors.text,
    fontSize: 15,
    flexShrink: 1,
  },
  nameStruck: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  qtyBadge: {
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  qtyBadgeText: {
    ...typography.caption,
    fontFamily: fontFamily.bold,
    color: colors.textMuted,
    fontSize: 11,
  },
  reference: {
    ...typography.caption,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deltaText: {
    ...typography.caption,
    color: colors.warning,
    fontFamily: fontFamily.semibold,
  },
  memberRows: { gap: spacing.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center' },
});
