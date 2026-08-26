import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LobbyStackParamList } from '../../../navigation/types';
import { LtrText, PlaceholderLinks, ScreenPlaceholder } from '../../../ui';

type Props = NativeStackScreenProps<LobbyStackParamList, 'LobbyShare'>;

export function LobbyShareScreen({ navigation, route }: Props) {
  const { lobbyCode } = route.params;

  return (
    <ScreenPlaceholder
      name="LobbyShare"
      description="Hand the code to everyone else."
    >
      <LtrText>{lobbyCode}</LtrText>
      <PlaceholderLinks
        links={[
          {
            label: 'LobbyRoom',
            onPress: () => navigation.navigate('LobbyRoom', { lobbyCode }),
          },
        ]}
      />
    </ScreenPlaceholder>
  );
}
