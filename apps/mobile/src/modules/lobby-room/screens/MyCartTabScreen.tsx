import React from 'react';
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
import { useLobbyByCode } from '../../lobby/hooks/useLobby';
import {
  useMyOrder,
  useRemoveOrderItem,
  useUpdateOrderItem,
} from '../hooks/useOrders';
import type { OrderItem } from '../../../api/endpoints/orders';
import { LockedNotice } from '../components/LockedNotice';
import { QuantityStepper } from '../components/QuantityStepper';

type Props = BottomTabScreenProps<LobbyRoomTabParamList, 'MyCart'>;

const EDGES = ['top', 'left', 'right'] as const;

interface CartRowProps {
  item: OrderItem;
  isOpen: boolean;
  lobbyCode: string;
  lobbyId: string;
}

function CartRow({ item, isOpen, lobbyCode, lobbyId }: CartRowProps) {
  const { t } = useTranslation();
  const updateItem = useUpdateOrderItem(lobbyCode, lobbyId);
  const removeItem = useRemoveOrderItem(lobbyCode, lobbyId);
  const isSyncing = item.id.startsWith('optimistic-');

  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.info}>
        <Text style={rowStyles.name}>{item.menuItem?.name ?? ''}</Text>
        <Text style={rowStyles.lineTotal}>EGP {item.lineTotal}</Text>
      </View>
      {isOpen ? (
        <View style={rowStyles.actions}>
          <QuantityStepper
            qty={item.qty}
            disabled={isSyncing}
            onIncrement={() =>
              updateItem.mutate({ itemId: item.id, qty: item.qty + 1 })
            }
            onDecrement={() => {
              if (item.qty > 1) {
                updateItem.mutate({ itemId: item.id, qty: item.qty - 1 });
              } else {
                removeItem.mutate(item.id);
              }
            }}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('order.remove')}
            onPress={() => removeItem.mutate(item.id)}
            disabled={isSyncing}
            style={rowStyles.removeBtn}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={rowStyles.readOnlyQty}>x{item.qty}</Text>
      )}
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
    gap: spacing.md,
  },
  info: { flex: 1, gap: 2 },
  name: { ...typography.label, color: colors.text, fontSize: 15 },
  lineTotal: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: fontFamily.semibold,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  removeBtn: { padding: spacing.xs },
  readOnlyQty: { ...typography.money, color: colors.textMuted, fontSize: 14 },
});

export function MyCartTabScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { lobbyCode } = route.params;

  const lobbyQuery = useLobbyByCode(lobbyCode);
  const lobby = lobbyQuery.data;
  const myOrderQuery = useMyOrder(lobbyCode, lobby?.id);

  const isLoading = lobbyQuery.isLoading || myOrderQuery.isLoading;
  const isError = lobbyQuery.isError || myOrderQuery.isError;

  if (isLoading) {
    return (
      <Screen edges={EDGES} testID="my-cart-tab-screen">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (isError || !lobby) {
    return (
      <Screen edges={EDGES} testID="my-cart-tab-screen">
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
              void myOrderQuery.refetch();
            }}
          >
            <Text style={styles.retryLabel}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const isOpen = lobby.status === 'open';
  const items = myOrderQuery.data?.items ?? [];

  return (
    <Screen edges={EDGES} padded={false} testID="my-cart-tab-screen">
      {!isOpen && (
        <LockedNotice status={lobby.status} testID="cart-locked-notice" />
      )}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CartRow
            item={item}
            isOpen={isOpen}
            lobbyCode={lobbyCode}
            lobbyId={lobby.id}
          />
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="cart-outline" size={44} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('order.cartEmpty')}</Text>
            {isOpen && (
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => navigation.navigate('Menu', { lobbyCode })}
              >
                <Text style={styles.browseBtnText}>
                  {t('order.browseMenu')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      {items.length > 0 && (
        <View style={styles.subtotalBar}>
          <Text style={styles.subtotalLabel}>{t('order.subtotal')}</Text>
          <Text style={styles.subtotalValue}>
            EGP {myOrderQuery.data?.subtotal}
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
  browseBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  browseBtnText: { ...typography.label, color: colors.onPrimary },
  listContent: { flexGrow: 1 },
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
