import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
  Screen,
  colors,
  fontFamily,
  radius,
  spacing,
  typography,
} from '../../../ui';
import { useCurrentMember, useLobbyByCode } from '../../lobby/hooks/useLobby';
import { useOrderSummary } from '../../lobby-room/hooks/useOrders';
import type { AggregatedOrderItem } from '../../../api/endpoints/orders';

type Props = NativeStackScreenProps<LobbyStackParamList, 'OrderSummary'>;

const UNCATEGORIZED = 'Uncategorized';

function groupByCategory(
  items: AggregatedOrderItem[],
): { title: string; data: AggregatedOrderItem[] }[] {
  const map = new Map<string, AggregatedOrderItem[]>();
  for (const item of items) {
    const cat = item.category.trim() || UNCATEGORIZED;
    const bucket = map.get(cat);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(cat, [item]);
    }
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

function SummaryRow({ item }: { item: AggregatedOrderItem }) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.left}>
        <View style={rowStyles.qtyBadge}>
          <Text style={rowStyles.qtyBadgeText}>x{item.totalQty}</Text>
        </View>
        <Text style={rowStyles.name}>{item.name}</Text>
      </View>
      <View style={rowStyles.right}>
        <Text style={rowStyles.unitPrice}>EGP {item.unitPrice}</Text>
        <Text style={rowStyles.totalPrice}>EGP {item.totalPrice}</Text>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexShrink: 1,
  },
  qtyBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 34,
    alignItems: 'center',
  },
  qtyBadgeText: {
    ...typography.caption,
    fontFamily: fontFamily.bold,
    color: colors.onPrimary,
    fontSize: 12,
  },
  name: {
    ...typography.label,
    color: colors.text,
    fontSize: 15,
    flexShrink: 1,
  },
  right: { alignItems: 'flex-end', gap: 2 },
  unitPrice: { ...typography.caption, color: colors.textMuted },
  totalPrice: { ...typography.money, color: colors.primary, fontSize: 15 },
});

export function OrderSummaryScreen({ route }: Props) {
  const { t } = useTranslation();
  const { lobbyCode } = route.params;

  const lobbyQuery = useLobbyByCode(lobbyCode);
  const lobby = lobbyQuery.data;
  const currentMember = useCurrentMember(lobby);
  const isAdmin = currentMember?.role === 'admin';

  const summaryQuery = useOrderSummary(lobbyCode, lobby?.id, isAdmin);
  const sections = useMemo(
    () => groupByCategory(summaryQuery.data?.items ?? []),
    [summaryQuery.data],
  );

  if (lobbyQuery.isLoading || (isAdmin && summaryQuery.isLoading)) {
    return (
      <Screen testID="order-summary-screen">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (lobbyQuery.isError || !lobby) {
    return (
      <Screen testID="order-summary-screen">
        <View style={styles.center}>
          <Ionicons
            name="cloud-offline-outline"
            size={44}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>{t('order.loadError')}</Text>
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
      <Screen testID="order-summary-screen">
        <View style={styles.center}>
          <Ionicons
            name="lock-closed-outline"
            size={44}
            color={colors.textMuted}
          />
          <Text style={styles.emptyTitle}>
            {t('order.summaryAdminOnlyTitle')}
          </Text>
          <Text style={styles.emptyText}>
            {t('order.summaryAdminOnlyBody')}
          </Text>
        </View>
      </Screen>
    );
  }

  const summary = summaryQuery.data;

  return (
    <Screen padded={false} testID="order-summary-screen">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{lobby.restaurant?.name ?? ''}</Text>
        <Text style={styles.headerSubtitle}>{t('order.summarySubtitle')}</Text>
      </View>
      <FlatList
        data={sections}
        keyExtractor={(section) => section.title}
        renderItem={({ item: section }) => (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            {section.data.map((row) => (
              <SummaryRow key={row.menuItemId} item={row} />
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons
              name="receipt-outline"
              size={44}
              color={colors.textMuted}
            />
            <Text style={styles.emptyText}>{t('order.summaryEmpty')}</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      {summary && summary.items.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerCount}>
            {t('order.summaryTotalItems', { count: summary.totalItemsCount })}
          </Text>
          <View style={styles.footerTotalRow}>
            <Text style={styles.footerTotalLabel}>
              {t('order.summaryGrandTotal')}
            </Text>
            <Text style={styles.footerTotalValue}>
              EGP {summary.grandTotal}
            </Text>
          </View>
        </View>
      )}
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: { ...typography.title, fontSize: 20, color: colors.text },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    ...typography.caption,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  listContent: { flexGrow: 1, paddingBottom: spacing.xxl },
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  footerCount: { ...typography.caption, color: colors.textMuted },
  footerTotalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerTotalLabel: { ...typography.label, color: colors.text },
  footerTotalValue: {
    ...typography.money,
    color: colors.primary,
    fontSize: 20,
  },
});
