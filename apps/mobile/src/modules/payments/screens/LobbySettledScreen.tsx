import React from 'react';
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
  LtrText,
  MemberChip,
  Screen,
  colors,
  radius,
  spacing,
  typography,
} from '../../../ui';
import { getApiError } from '../../../api/client';
import { useLobbyByCode } from '../../lobby/hooks/useLobby';
import { usePaymentBoard } from '../hooks/usePayments';

type Props = NativeStackScreenProps<LobbyStackParamList, 'LobbySettled'>;

/**
 * The lobby after close-out: a receipt, and nothing else.
 *
 * There is deliberately not a single mutating control on this screen — no pay
 * button, no confirm, no reject, no settle. The backend refuses every one of
 * those once the lobby is settled, and this screen is the visible half of that
 * same rule.
 */
export function LobbySettledScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { lobbyCode } = route.params;

  const lobbyQuery = useLobbyByCode(lobbyCode);
  const boardQuery = usePaymentBoard(lobbyCode, lobbyQuery.data?.id);
  const board = boardQuery.data;

  if (lobbyQuery.isLoading || boardQuery.isLoading) {
    return (
      <Screen testID="lobby-settled-screen">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (boardQuery.isError || !board) {
    return (
      <Screen testID="lobby-settled-screen">
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
            testID="lobby-settled-retry"
          />
        </View>
      </Screen>
    );
  }

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.banner}>
        <Ionicons name="checkmark-circle" size={44} color={colors.success} />
        <Text style={styles.bannerTitle}>{t('payments.settledTitle')}</Text>
        <Text style={styles.bannerBody}>{t('payments.settledBody')}</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>{t('payments.totalCollected')}</Text>
        <LtrText style={styles.summaryValue}>
          {t('payments.currencyAmount', { amount: board.grandTotal })}
        </LtrText>
      </View>

      <Text style={styles.rosterTitle}>{t('payments.receiptTitle')}</Text>
    </View>
  );

  return (
    <Screen padded={false} testID="lobby-settled-screen">
      <FlatList
        data={board.members}
        keyExtractor={(member) => member.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={styles.row} testID={`receipt-member-${item.id}`}>
            <MemberChip name={item.displayName} size="md" />
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {item.displayName}
                {item.id === board.you.memberId ? ` (${t('order.you')})` : ''}
              </Text>
              {item.role === 'admin' && (
                <Text style={styles.hostLabel}>{t('order.host')}</Text>
              )}
            </View>
            <LtrText style={styles.amount}>
              {t('payments.currencyAmount', { amount: item.total })}
            </LtrText>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Button
              label={t('payments.backToHome')}
              variant="outline"
              onPress={() => navigation.getParent()?.goBack()}
              testID="lobby-settled-done"
            />
          </View>
        }
        contentContainerStyle={styles.listContent}
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
  banner: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  bannerTitle: { ...typography.title, color: colors.text },
  bannerBody: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
    alignItems: 'center',
  },
  summaryLabel: { ...typography.caption, color: colors.textMuted },
  summaryValue: { ...typography.money, fontSize: 24, color: colors.success },
  rosterTitle: { ...typography.title, fontSize: 18, color: colors.text },
  row: {
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
  info: { flex: 1 },
  name: { ...typography.label, color: colors.text, fontSize: 15 },
  hostLabel: { ...typography.caption, color: colors.primary, fontSize: 11 },
  amount: { ...typography.money, color: colors.text, fontSize: 15 },
  footer: { padding: spacing.lg },
});
