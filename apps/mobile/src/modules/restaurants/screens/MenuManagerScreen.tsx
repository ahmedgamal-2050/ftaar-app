import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RestaurantsStackParamList } from '../../../navigation/types';
import { PlaceholderLinks, ScreenPlaceholder } from '../../../ui';

type Props = NativeStackScreenProps<RestaurantsStackParamList, 'MenuManager'>;

export function MenuManagerScreen({ navigation, route }: Props) {
  const { restaurantId } = route.params;

  return (
    <ScreenPlaceholder
      name="MenuManager"
      description={`Menu sections and items for restaurant ${restaurantId}.`}
    >
      <PlaceholderLinks
        links={[
          {
            label: 'BulkMenuPaste',
            onPress: () =>
              navigation.navigate('BulkMenuPaste', { restaurantId }),
          },
        ]}
      />
    </ScreenPlaceholder>
  );
}
