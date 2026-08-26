import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LobbyStackParamList } from '../../../navigation/types';
import { PlaceholderLinks, ScreenPlaceholder } from '../../../ui';

type Props = NativeStackScreenProps<LobbyStackParamList, 'PaymentBoard'>;

export function PaymentBoardScreen({ navigation, route }: Props) {
  const { lobbyCode } = route.params;

  return (
    <ScreenPlaceholder
      name="PaymentBoard"
      description={`Who has paid and who has not in lobby ${lobbyCode}.`}
    >
      <PlaceholderLinks
        links={[
          {
            label: 'LobbySettled',
            onPress: () => navigation.navigate('LobbySettled', { lobbyCode }),
          },
        ]}
      />
    </ScreenPlaceholder>
  );
}
