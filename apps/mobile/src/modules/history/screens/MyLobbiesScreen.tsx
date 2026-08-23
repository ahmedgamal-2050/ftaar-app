import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { SAMPLE_LOBBY_CODE } from '../../lobby/lobbySample';
import { LtrText, PlaceholderLinks, ScreenPlaceholder } from '../../../ui';

export function MyLobbiesScreen() {
  const rootNavigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScreenPlaceholder
      name="MyLobbies"
      description="Past and active lobbies — the History tab's only screen."
    >
      <LtrText>{SAMPLE_LOBBY_CODE}</LtrText>
      <PlaceholderLinks
        links={[
          {
            label: 'LobbyRoom',
            onPress: () =>
              rootNavigation.navigate('LobbyStack', {
                screen: 'LobbyRoom',
                params: { lobbyCode: SAMPLE_LOBBY_CODE },
              }),
          },
        ]}
      />
    </ScreenPlaceholder>
  );
}
