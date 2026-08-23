import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { LobbyRoomTabParamList, LobbyStackParamList } from '../../../navigation/types';
import { PlaceholderLinks, ScreenPlaceholder } from '../../../ui';

type Props = BottomTabScreenProps<LobbyRoomTabParamList, 'Group'>;

const EDGES = ['top', 'left', 'right'] as const;

export function GroupTabScreen({ route }: Props) {
  const { lobbyCode } = route.params;
  // Closing the order pushes onto the LobbyStack, one level above these tabs.
  const lobbyNavigation = useNavigation<NativeStackNavigationProp<LobbyStackParamList>>();

  return (
    <ScreenPlaceholder
      name="Group"
      edges={EDGES}
      description={`Everyone in lobby ${lobbyCode} and what they ordered.`}
    >
      <PlaceholderLinks
        links={[
          {
            label: 'OrderSummary',
            onPress: () => lobbyNavigation.navigate('OrderSummary', { lobbyCode }),
          },
        ]}
      />
    </ScreenPlaceholder>
  );
}
