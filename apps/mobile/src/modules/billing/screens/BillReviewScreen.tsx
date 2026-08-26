import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LobbyStackParamList } from '../../../navigation/types';
import { PlaceholderLinks, ScreenPlaceholder } from '../../../ui';

type Props = NativeStackScreenProps<LobbyStackParamList, 'BillReview'>;

export function BillReviewScreen({ navigation, route }: Props) {
  const { lobbyCode } = route.params;

  return (
    <ScreenPlaceholder
      name="BillReview"
      description={`Compare expected against actual for lobby ${lobbyCode} before anyone pays.`}
    >
      <PlaceholderLinks
        links={[
          {
            label: 'PaymentBoard',
            onPress: () => navigation.navigate('PaymentBoard', { lobbyCode }),
          },
        ]}
      />
    </ScreenPlaceholder>
  );
}
