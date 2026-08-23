import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LobbyStackParamList } from '../../../navigation/types';
import { PlaceholderLinks, ScreenPlaceholder } from '../../../ui';

type Props = NativeStackScreenProps<LobbyStackParamList, 'OrderSummary'>;

export function OrderSummaryScreen({ navigation, route }: Props) {
  const { lobbyCode } = route.params;

  return (
    <ScreenPlaceholder
      name="OrderSummary"
      description={`The consolidated order for lobby ${lobbyCode}, ready to send to the restaurant.`}
    >
      <PlaceholderLinks
        links={[
          { label: 'BillEntry', onPress: () => navigation.navigate('BillEntry', { lobbyCode }) },
        ]}
      />
    </ScreenPlaceholder>
  );
}
