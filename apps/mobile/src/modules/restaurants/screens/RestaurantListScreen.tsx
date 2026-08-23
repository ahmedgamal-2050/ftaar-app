import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RestaurantsStackParamList } from '../../../navigation/types';
import { useAuth } from '../../../auth/AuthContext';
import { PlaceholderLinks, ScreenPlaceholder } from '../../../ui';
import { RestaurantsLockedNotice } from '../components/RestaurantsLockedNotice';

type Props = NativeStackScreenProps<
  RestaurantsStackParamList,
  'RestaurantList'
>;

const SAMPLE_RESTAURANT_ID = 'sample-restaurant';

export function RestaurantListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const isLocked = user?.isGuest ?? true;

  return (
    <ScreenPlaceholder
      name="RestaurantList"
      description={
        isLocked
          ? 'Same Restaurants tab — locked for guests, not a different destination.'
          : 'Restaurants owned by the current user.'
      }
    >
      {isLocked ? <RestaurantsLockedNotice /> : null}
      <PlaceholderLinks
        links={[
          {
            label: 'RestaurantForm',
            onPress: () => navigation.navigate('RestaurantForm'),
          },
          {
            label: 'MenuManager',
            onPress: () =>
              navigation.navigate('MenuManager', {
                restaurantId: SAMPLE_RESTAURANT_ID,
              }),
          },
          {
            label: 'BulkMenuPaste',
            onPress: () =>
              navigation.navigate('BulkMenuPaste', {
                restaurantId: SAMPLE_RESTAURANT_ID,
              }),
          },
        ]}
      />
    </ScreenPlaceholder>
  );
}
