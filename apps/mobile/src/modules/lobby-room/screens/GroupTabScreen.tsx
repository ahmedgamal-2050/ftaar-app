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
import { useNavigation } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type {
  LobbyRoomTabParamList,
  LobbyStackParamList,
} from '../../../navigation/types';
import {
  Screen,
  colors,
  fontFamily,
  radius,
  spacing,
  typography,
  MemberChip,
} from '../../../ui';
import { useCurrentMember, useLobbyByCode } from '../../lobby/hooks/useLobby';
import { useLobbyOrders, useMyOrder } from '../hooks/useOrders';
import type { LobbyMember } from '../../../api/endpoints/lobbies';
import type { OrderItem } from '../../../api/endpoints/orders';

type Props = BottomTabScreenProps<LobbyRoomTabParamList, 'Group'>;

const EDGES = ['top', 'left', 'right'] as const;

interface MemberCardData {
  member: LobbyMember;
  items: OrderItem[];
  subtotal: string;
}

function subtotalOf(items: OrderItem[]): string {
  const piastres = items.reduce(
    (sum, i) => sum + Math.round(parseFloat(i.lineTotal) * 100),
    0,
  );
  return (piastres / 100).toFixed(2);
}

function MemberCard({
  member,
  items,
  subtotal,
  isYou,
}: MemberCardData & { isYou: boolean }) {
  const { t } = useTranslation();
  const itemsPreview = items
    .map((i) => `${i.menuItem?.name ?? ''} x${i.qty}`)
    .join(', ');

  return (
    <View style={cardStyles.card}>
      <MemberChip name={member.displayName} size="md" />
      <View style={cardStyles.info}>
        <View style={cardStyles.nameRow}>
          <Text style={cardStyles.name} numberOfLines={1}>
            {member.displayName}
            {isYou ? ` (${t('order.you')})` : ''}
          </Text>
          {member.role === 'admin' && (
            <View style={cardStyles.hostBadge}>
              <Text style={cardStyles.hostBadgeText}>{t('order.host')}</Text>
            </View>
          )}
        </View>
        <Text style={cardStyles.itemsPreview} numberOfLines={1}>
          {items.length > 0 ? itemsPreview : t('order.groupEmptyMemberCart')}
        </Text>
      </View>
      <Text style={cardStyles.amount}>EGP {subtotal}</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  info: { flex: 1, gap: 2 },
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
  itemsPreview: { ...typography.caption, color: colors.textMuted },
  amount: { ...typography.money, color: colors.primary, fontSize: 15 },
});

export function GroupTabScreen({ route }: Props) {
  const { t } = useTranslation();
  const { lobbyCode } = route.params;
  // Closing the order pushes onto the LobbyStack, one level above these tabs.
  const lobbyNavigation =
    useNavigation<NativeStackNavigationProp<LobbyStackParamList>>();

  const lobbyQuery = useLobbyByCode(lobbyCode);
  const lobby = lobbyQuery.data;
  const currentMember = useCurrentMember(lobby);
  const isAdmin = currentMember?.role === 'admin';

  const lobbyOrdersQuery = useLobbyOrders(lobbyCode, lobby?.id, isAdmin);
  const myOrderQuery = useMyOrder(lobbyCode, lobby?.id);

  const memberCards = useMemo<MemberCardData[]>(() => {
    if (!lobby) return [];
    const itemsByMember = new Map<string, OrderItem[]>();
    for (const item of lobbyOrdersQuery.data?.items ?? []) {
      const bucket = itemsByMember.get(item.lobbyMemberId);
      if (bucket) {
        bucket.push(item);
      } else {
        itemsByMember.set(item.lobbyMemberId, [item]);
      }
    }
    return lobby.members.map((member) => {
      const items = itemsByMember.get(member.id) ?? [];
      return { member, items, subtotal: subtotalOf(items) };
    });
  }, [lobby, lobbyOrdersQuery.data]);

  const isLoading =
    lobbyQuery.isLoading || (isAdmin && lobbyOrdersQuery.isLoading);

  if (isLoading) {
    return (
      <Screen edges={EDGES} testID="group-tab-screen">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (lobbyQuery.isError || !lobby) {
    return (
      <Screen edges={EDGES} testID="group-tab-screen">
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

  if (isAdmin) {
    return (
      <Screen edges={EDGES} padded={false} testID="group-tab-screen">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {t('order.groupMemberBreakdownTitle')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t('order.groupMemberCount', { count: lobby.members.length })}
          </Text>
        </View>
        <FlatList
          data={memberCards}
          keyExtractor={(row) => row.member.id}
          renderItem={({ item }) => (
            <MemberCard
              {...item}
              isYou={item.member.id === currentMember?.id}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
        <TouchableOpacity
          style={styles.summaryBtn}
          onPress={() =>
            lobbyNavigation.navigate('OrderSummary', { lobbyCode })
          }
        >
          <Ionicons name="call-outline" size={18} color={colors.onPrimary} />
          <Text style={styles.summaryBtnText}>
            {t('order.groupViewSummary')}
          </Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  // Regular member: the backend only exposes the full merged order to the
  // admin, so this stays a roster plus the member's own cart preview.
  return (
    <Screen edges={EDGES} padded={false} testID="group-tab-screen">
      <View style={styles.hostOnlyNotice}>
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={colors.textMuted}
        />
        <Text style={styles.hostOnlyNoticeText}>
          {t('order.groupHostOnlyNotice')}
        </Text>
      </View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('order.groupMembersTitle')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('order.groupMemberCount', { count: lobby.members.length })}
        </Text>
      </View>
      <FlatList
        data={lobby.members}
        keyExtractor={(member) => member.id}
        renderItem={({ item: member }) => (
          <View style={cardStyles.card}>
            <MemberChip name={member.displayName} size="md" />
            <View style={cardStyles.info}>
              <View style={cardStyles.nameRow}>
                <Text style={cardStyles.name} numberOfLines={1}>
                  {member.displayName}
                  {member.id === currentMember?.id
                    ? ` (${t('order.you')})`
                    : ''}
                </Text>
                {member.role === 'admin' && (
                  <View style={cardStyles.hostBadge}>
                    <Text style={cardStyles.hostBadgeText}>
                      {t('order.host')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
      {myOrderQuery.data && myOrderQuery.data.items.length > 0 && (
        <View style={styles.subtotalBar}>
          <Text style={styles.subtotalLabel}>{t('order.groupYourCart')}</Text>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: { ...typography.title, fontSize: 18, color: colors.text },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  listContent: { paddingBottom: spacing.xxl },
  hostOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  hostOnlyNoticeText: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 1,
  },
  summaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
  },
  summaryBtnText: { ...typography.label, color: colors.onPrimary },
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
