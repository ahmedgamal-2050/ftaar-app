import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RestaurantsStackParamList } from '../../../navigation/types';
import type { RootStackParamList } from '../../../navigation/types';
import { useAuth } from '../../../auth/AuthContext';
import { Screen } from '../../../ui/components/Screen';
import { colors, fontFamily, radius, spacing, typography } from '../../../ui';
import { useRestaurants } from '../hooks/useRestaurants';
import type { Restaurant } from '../../../api/endpoints/restaurants';

type Props = NativeStackScreenProps<
  RestaurantsStackParamList,
  'RestaurantList'
>;

/** Deterministic warm accent per restaurant so cards feel distinct without real images */
const CARD_ACCENTS = [
  '#C8956A',
  '#A0785A',
  '#7A5C48',
  '#B07050',
  '#D4A078',
  '#8A6858',
];
function cardAccent(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return CARD_ACCENTS[Math.abs(hash) % CARD_ACCENTS.length] ?? CARD_ACCENTS[0];
}

function RestaurantCard({
  item,
  onPress,
}: {
  item: Restaurant;
  onPress: () => void;
}) {
  const accent = cardAccent(item.id);
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.name} menu`}
      activeOpacity={0.75}
    >
      <View style={styles.card}>
        {/* Image — use real URL if available, else warm-toned placeholder */}
        <View style={[styles.cardImage, { backgroundColor: accent }]}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name="restaurant"
              size={40}
              color="rgba(255,255,255,0.35)"
            />
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.cardMeta}>
            <Ionicons name="call-outline" size={12} color={colors.textMuted} />
            <Text style={styles.cardMetaText}>{item.phone || '—'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/** Inline guest nudge card matching the design */
function GuestCard() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={styles.guestCard}>
      <View style={styles.guestAvatarWrap}>
        <Text style={styles.guestAvatarLabel}>G</Text>
      </View>
      <View style={styles.guestTextWrap}>
        <Text style={styles.guestTitle}>Guest Visitor</Text>
        <Text style={styles.guestSubtitle}>
          Want to add your own favorites? Create an account to manage your
          restaurant list.
        </Text>
        <TouchableOpacity
          style={styles.guestRegisterBtn}
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate('MainTabs', {
              screen: 'Profile',
              params: { screen: 'Register' },
            })
          }
        >
          <Text style={styles.guestRegisterLabel}>Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function RestaurantListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const isGuest = user?.isGuest ?? true;

  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch } = useRestaurants(search);

  // Remove header buttons — we use an in-list FAB instead
  useLayoutEffect(() => {
    navigation.setOptions({ headerRight: undefined });
  }, [navigation]);

  const items = useMemo(() => data?.items ?? [], [data]);

  const renderItem = ({ item }: { item: Restaurant }) => (
    <RestaurantCard
      item={item}
      onPress={() =>
        navigation.navigate('MenuManager', { restaurantId: item.id })
      }
    />
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    if (isError)
      return (
        <View style={styles.centerState}>
          <Ionicons
            name="cloud-offline-outline"
            size={44}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>Couldn't load restaurants.</Text>
          <TouchableOpacity
            onPress={() => void refetch()}
            style={styles.retryBtn}
          >
            <Text style={styles.retryBtnLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    return (
      <View style={styles.centerState}>
        <Ionicons
          name="restaurant-outline"
          size={44}
          color={colors.textMuted}
        />
        <Text style={styles.emptyText}>
          {search.trim()
            ? 'No restaurants match your search.'
            : 'No restaurants yet. Be the first to add one!'}
        </Text>
      </View>
    );
  };

  return (
    <Screen padded={false} testID="restaurant-list-screen">
      {/* ── Page title ── */}
      <Text style={styles.pageTitle}>My Restaurants</Text>

      {/* ── Search bar ── */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          id="restaurant-search-input"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search your favorites..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* ── Loading ── */}
      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={isGuest ? <GuestCard /> : null}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* ── FAB — registered users only ── */}
      {!isGuest && (
        <TouchableOpacity
          id="restaurant-list-fab"
          accessibilityRole="button"
          accessibilityLabel="Add restaurant"
          style={styles.fab}
          onPress={() => navigation.navigate('RestaurantForm')}
        >
          <Ionicons name="add" size={30} color={colors.onPrimary} />
        </TouchableOpacity>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    ...typography.title,
    color: colors.text,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  // ── Search ──
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
    fontSize: 14,
  },

  // ── Guest card ──
  guestCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guestAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  guestAvatarLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.onPrimary,
    lineHeight: 22,
  },
  guestTextWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  guestTitle: {
    ...typography.label,
    color: colors.text,
  },
  guestSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  guestRegisterBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  guestRegisterLabel: {
    ...typography.label,
    color: colors.onPrimary,
    fontSize: 14,
  },

  // ── Restaurant card ──
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: 100, // room for FAB
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardImage: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  cardName: {
    ...typography.label,
    color: colors.text,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardMetaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  separator: {
    height: spacing.md,
  },

  // ── States ──
  centerState: {
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
  retryBtnLabel: {
    ...typography.label,
    color: colors.onPrimary,
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: spacing.xxl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
