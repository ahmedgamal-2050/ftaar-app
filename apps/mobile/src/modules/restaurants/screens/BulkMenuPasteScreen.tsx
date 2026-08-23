import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RestaurantsStackParamList } from '../../../navigation/types';
import { ScreenPlaceholder } from '../../../ui';

type Props = NativeStackScreenProps<RestaurantsStackParamList, 'BulkMenuPaste'>;

export function BulkMenuPasteScreen({ route }: Props) {
  return (
    <ScreenPlaceholder
      name="BulkMenuPaste"
      description={`Paste a whole menu as text for restaurant ${route.params.restaurantId}.`}
    />
  );
}
