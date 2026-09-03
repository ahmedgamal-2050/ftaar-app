import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { LobbyRoomTabParamList } from '../../../navigation/types';
import {
  Screen,
  colors,
  fontFamily,
  radius,
  spacing,
  typography,
} from '../../../ui';
import { useCurrentMember, useLobbyByCode } from '../../lobby/hooks/useLobby';
import {
  useAddOrderItem,
  useMyOrder,
  useRemoveOrderItem,
  useUpdateOrderItem,
} from '../hooks/useOrders';
import { useMenu } from '../../restaurants/hooks/useMenu';
import type { MenuItem } from '../../../api/endpoints/menu';
import type { OrderItem } from '../../../api/endpoints/orders';
import { LockedNotice } from '../components/LockedNotice';
import { QuantityStepper } from '../components/QuantityStepper';

type Props = BottomTabScreenProps<LobbyRoomTabParamList, 'Menu'>;

// The lobby tab bar owns the home indicator; Screen still reserves the notch.
const EDGES = ['top', 'left', 'right'] as const;

const UNCATEGORIZED = 'Uncategorized';

function groupByCategory(
  items: MenuItem[],
): { title: string; data: MenuItem[] }[] {
  const map = new Map<string, MenuItem[]>();
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

interface MenuRowProps {
  item: MenuItem;
  orderItem: OrderItem | undefined;
  isOpen: boolean;
  lobbyCode: string;
  lobbyId: string;
}

function MenuRow({
  item,
  orderItem,
  isOpen,
  lobbyCode,
  lobbyId,
}: MenuRowProps) {
  const addItem = useAddOrderItem(lobbyCode, lobbyId);
  const updateItem = useUpdateOrderItem(lobbyCode, lobbyId);
  const removeItem = useRemoveOrderItem(lobbyCode, lobbyId);

  const qty = orderItem?.qty ?? 0;
  // Freshly-added rows carry a client-side id until the mutation settles —
  // editing that id further would 404, so hold decrements off till then.
  const isSyncing = !!orderItem?.id.startsWith('optimistic-');

  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.info}>
        <Text style={rowStyles.name}>{item.name}</Text>
        <Text style={rowStyles.price}>EGP {item.referencePrice}</Text>
      </View>
      {isOpen ? (
        <QuantityStepper
          qty={qty}
          disabled={isSyncing}
          onIncrement={() =>
            addItem.mutate({ menuItemId: item.id, qty: 1, menuItem: item })
          }
          onDecrement={() => {
            if (!orderItem) return;
            if (qty > 1) {
              updateItem.mutate({ itemId: orderItem.id, qty: qty - 1 });
            } else {
              removeItem.mutate(orderItem.id);
            }
          }}
        />
      ) : qty > 0 ? (
        <View style={rowStyles.readOnlyQty}>
          <Text style={rowStyles.readOnlyQtyText}>x{qty}</Text>
        </View>
      ) : null}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  info: { flex: 1, gap: 2 },
  name: { ...typography.label, color: colors.text, fontSize: 15 },
  price: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: fontFamily.semibold,
  },
  readOnlyQty: {
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  readOnlyQtyText: {
    ...typography.money,
    color: colors.textMuted,
    fontSize: 14,
  },
});

export function MenuTabScreen({ route }: Props) {
  const { t } = useTranslation();
  const { lobbyCode } = route.params;

  const lobbyQuery = useLobbyByCode(lobbyCode);
  const lobby = lobbyQuery.data;
  const currentMember = useCurrentMember(lobby);

  const menuQuery = useMenu(lobby?.restaurantId ?? '');
  const myOrderQuery = useMyOrder(lobbyCode, lobby?.id);

  const activeItems = useMemo(
    () => (menuQuery.data ?? []).filter((i) => i.isActive),
    [menuQuery.data],
  );
  const sections = useMemo(() => groupByCategory(activeItems), [activeItems]);

  const myItemsByMenuItemId = useMemo(() => {
    const map = new Map<string, OrderItem>();
    for (const item of myOrderQuery.data?.items ?? []) {
      map.set(item.menuItemId, item);
    }
    return map;
  }, [myOrderQuery.data]);

  const isLoading = lobbyQuery.isLoading || menuQuery.isLoading;
  const isError = lobbyQuery.isError || menuQuery.isError;

  if (isLoading) {
    return (
      <Screen edges={EDGES} testID="menu-tab-screen">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (isError || !lobby) {
    return (
      <Screen edges={EDGES} testID="menu-tab-screen">
        <View style={styles.center}>
          <Ionicons
            name="cloud-offline-outline"
            size={44}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>{t('order.loadError')}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              void lobbyQuery.refetch();
              void menuQuery.refetch();
            }}
          >
            <Text style={styles.retryLabel}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const isOpen = lobby.status === 'open';

  return (
    <Screen edges={EDGES} padded={false} testID="menu-tab-screen">
      {!isOpen && (
        <LockedNotice status={lobby.status} testID="menu-locked-notice" />
      )}
      {lobby.restaurant?.name ? (
        <View style={styles.restaurantBar}>
          <Ionicons
            name="restaurant-outline"
            size={16}
            color={colors.primary}
          />
          <Text style={styles.restaurantName} numberOfLines={1}>
            {lobby.restaurant.name}
          </Text>
        </View>
      ) : null}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <MenuRow
            item={item}
            orderItem={myItemsByMenuItemId.get(item.id)}
            isOpen={isOpen}
            lobbyCode={lobbyCode}
            lobbyId={lobby.id}
          />
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons
              name="restaurant-outline"
              size={44}
              color={colors.textMuted}
            />
            <Text style={styles.emptyText}>{t('order.menuEmpty')}</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      {currentMember &&
        myOrderQuery.data &&
        myOrderQuery.data.items.length > 0 && (
          <View style={styles.subtotalBar}>
            <Text style={styles.subtotalLabel}>{t('order.subtotal')}</Text>
            <Text style={styles.subtotalValue}>
              EGP {myOrderQuery.data.subtotal}
            </Text>
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
  restaurantBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  restaurantName: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 1,
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
  subtotalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  subtotalLabel: { ...typography.body, color: colors.textMuted },
  subtotalValue: { ...typography.money, color: colors.primary, fontSize: 18 },
});
