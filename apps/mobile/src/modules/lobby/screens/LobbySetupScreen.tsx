import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LobbyStackParamList } from '../../../navigation/types';
import { useAuth } from '../../../auth/AuthContext';
import { getApiError } from '../../../api/client';
import type { Restaurant } from '../../../api/endpoints/restaurants';
import { useRestaurants } from '../../restaurants/hooks/useRestaurants';
import {
  Button,
  colors,
  ErrorBanner,
  radius,
  Screen,
  spacing,
  TextField,
  typography,
} from '../../../ui';
import { useCreateLobby } from '../hooks/useCreateLobby';

type Props = NativeStackScreenProps<LobbyStackParamList, 'LobbySetup'>;

function cutoffToIso(value: string): string | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) {
    throw new Error('Enter the cut-off time as HH:MM.');
  }
  const cutoff = new Date();
  cutoff.setSeconds(0, 0);
  cutoff.setHours(Number(match[1]), Number(match[2]));
  if (cutoff.getTime() <= Date.now()) {
    cutoff.setDate(cutoff.getDate() + 1);
  }
  return cutoff.toISOString();
}

function RestaurantOption({
  restaurant,
  selected,
  onPress,
}: {
  restaurant: Restaurant;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`Select ${restaurant.name}`}
      onPress={onPress}
      style={[styles.restaurantCard, selected && styles.restaurantCardSelected]}
    >
      <View style={styles.restaurantImage}>
        {restaurant.image ? (
          <Image
            source={{ uri: restaurant.image }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="restaurant" size={24} color={colors.textMuted} />
        )}
      </View>
      <View style={styles.restaurantCopy}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        {restaurant.note ? (
          <Text style={styles.restaurantNote} numberOfLines={1}>
            {restaurant.note}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={selected ? colors.primary : colors.border}
      />
    </TouchableOpacity>
  );
}

export function LobbySetupScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [restaurantId, setRestaurantId] = useState(
    route.params?.restaurantId ?? '',
  );
  const [maxMembers, setMaxMembers] = useState('');
  const [cutoffTime, setCutoffTime] = useState('');
  const [instaPayHandle, setInstaPayHandle] = useState(
    user?.instaPayHandle ?? '',
  );
  const [error, setError] = useState<string | null>(null);

  const restaurantsQuery = useRestaurants(search);
  const createLobby = useCreateLobby();
  const restaurants = useMemo(
    () => restaurantsQuery.data?.items ?? [],
    [restaurantsQuery.data],
  );
  const requiresGuestHandle = !!user?.isGuest && !user.instaPayHandle?.trim();

  async function handlePublish() {
    setError(null);
    if (!restaurantId) {
      setError('Select a restaurant first.');
      return;
    }

    const parsedMax = maxMembers.trim() ? Number(maxMembers) : undefined;
    if (
      parsedMax !== undefined &&
      (!Number.isInteger(parsedMax) || parsedMax < 2)
    ) {
      setError('Maximum members must be at least 2.');
      return;
    }

    const handle = instaPayHandle.trim().toLowerCase();
    if (requiresGuestHandle && !/^[a-z0-9._-]{3,50}$/i.test(handle)) {
      setError(
        'Enter a valid InstaPay handle (3–50 letters, numbers, dots, underscores, or hyphens).',
      );
      return;
    }

    try {
      const expiresAt = cutoffToIso(cutoffTime);
      const lobby = await createLobby.mutateAsync({
        restaurantId,
        ...(user?.isGuest && user.displayName
          ? { displayName: user.displayName }
          : {}),
        ...(parsedMax === undefined ? {} : { maxMembers: parsedMax }),
        ...(expiresAt ? { expiresAt } : {}),
        ...(handle ? { instaPayHandle: handle } : {}),
      });
      navigation.replace('LobbyShare', { lobbyCode: lobby.code });
    } catch (err) {
      if (err instanceof Error && !('response' in err)) {
        setError(err.message);
        return;
      }
      setError(getApiError(err).message);
    }
  }

  return (
    <Screen scroll testID="lobby-setup-screen" style={styles.screen}>
      <Text style={styles.title}>Create Breakfast Lobby</Text>
      <Text style={styles.subtitle}>
        Pick one restaurant and set the rules for your team's order.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Restaurant</Text>
        <TextField
          label="Search"
          value={search}
          onChangeText={setSearch}
          placeholder="Search for beans, falafel..."
          autoCapitalize="none"
          testID="lobby-restaurant-search"
        />

        {restaurantsQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : restaurantsQuery.isError ? (
          <ErrorBanner message="Couldn't load restaurants. Try again." />
        ) : restaurants.length === 0 ? (
          <Text style={styles.emptyText}>No restaurants found.</Text>
        ) : (
          <View accessibilityRole="radiogroup" style={styles.restaurantList}>
            {restaurants.map((restaurant) => (
              <RestaurantOption
                key={restaurant.id}
                restaurant={restaurant}
                selected={restaurant.id === restaurantId}
                onPress={() => setRestaurantId(restaurant.id)}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.rulesCard}>
        <Text style={styles.sectionTitle}>Lobby Rules (Optional)</Text>
        <TextField
          label="Maximum Members"
          value={maxMembers}
          onChangeText={setMaxMembers}
          placeholder="No limit"
          keyboardType="number-pad"
          testID="lobby-max-members"
        />
        <TextField
          label="Order Cut-off Time"
          value={cutoffTime}
          onChangeText={setCutoffTime}
          placeholder="HH:MM"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          helperText="Leave blank for no cut-off. Past times mean tomorrow."
          testID="lobby-cutoff-time"
        />
        {requiresGuestHandle ? (
          <TextField
            label="Where should members send the money?"
            value={instaPayHandle}
            onChangeText={setInstaPayHandle}
            placeholder="Your InstaPay handle"
            autoCapitalize="none"
            helperText="Guests only need to provide this when hosting."
            testID="lobby-payment-handle"
          />
        ) : null}
      </View>

      {error ? (
        <ErrorBanner message={error} testID="lobby-setup-error" />
      ) : null}
      <Button
        label="Publish Lobby"
        onPress={() => void handlePublish()}
        loading={createLobby.isPending}
        disabled={!restaurantId || restaurantsQuery.isLoading}
        testID="publish-lobby-button"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: -spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.text,
  },
  restaurantList: {
    gap: spacing.sm,
  },
  restaurantCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  restaurantCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  restaurantImage: {
    width: 56,
    height: 56,
    overflow: 'hidden',
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantCopy: {
    flex: 1,
  },
  restaurantName: {
    ...typography.label,
    color: colors.text,
  },
  restaurantNote: {
    ...typography.caption,
    color: colors.textMuted,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.lg,
  },
  rulesCard: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
});
