import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LobbyStackParamList } from '../../../navigation/types';
import { PlaceholderLinks, ScreenPlaceholder } from '../../../ui';
import { SAMPLE_LOBBY_CODE } from '../lobbySample';

type Props = NativeStackScreenProps<LobbyStackParamList, 'LobbySetup'>;

export function LobbySetupScreen({ navigation, route }: Props) {
  const restaurantId = route.params?.restaurantId;

  return (
    <ScreenPlaceholder
      name="LobbySetup"
      description={
        restaurantId
          ? `Pick the rules for a lobby at restaurant ${restaurantId}.`
          : 'Pick a restaurant and the rules for a new lobby.'
      }
    >
      <PlaceholderLinks
        links={[
          {
            label: 'LobbyShare',
            onPress: () =>
              navigation.navigate('LobbyShare', {
                lobbyCode: SAMPLE_LOBBY_CODE,
              }),
          },
        ]}
      />
    </ScreenPlaceholder>
  );
}
