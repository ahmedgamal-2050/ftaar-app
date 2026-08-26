import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RestaurantsStackParamList } from '../../../navigation/types';
import { PlaceholderLinks, ScreenPlaceholder } from '../../../ui';

type Props = NativeStackScreenProps<
  RestaurantsStackParamList,
  'RestaurantForm'
>;

const SAMPLE_RESTAURANT_ID = 'sample-restaurant';

export function RestaurantFormScreen({ navigation, route }: Props) {
  const restaurantId = route.params?.restaurantId ?? SAMPLE_RESTAURANT_ID;

  return (
    <ScreenPlaceholder
      name="RestaurantForm"
      description={
        route.params?.restaurantId
          ? `Edit restaurant ${route.params.restaurantId}.`
          : 'Create a restaurant.'
      }
    >
      <PlaceholderLinks
        links={[
          {
            label: 'MenuManager',
            onPress: () => navigation.navigate('MenuManager', { restaurantId }),
          },
        ]}
      />
    </ScreenPlaceholder>
  );
}
