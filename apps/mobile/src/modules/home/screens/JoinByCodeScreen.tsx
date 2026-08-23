import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { SAMPLE_LOBBY_CODE } from '../../lobby/lobbySample';
import { LtrText, PlaceholderLinks, ScreenPlaceholder } from '../../../ui';

export function JoinByCodeScreen() {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScreenPlaceholder
      name="JoinByCode"
      description="Lobby codes stay left-to-right via LtrText."
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
