import React from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { LobbyRoomTabParamList } from '../../../navigation/types';
import { ScreenPlaceholder } from '../../../ui';

type Props = BottomTabScreenProps<LobbyRoomTabParamList, 'Menu'>;

// The lobby tab bar owns the home indicator; Screen still reserves the notch.
const EDGES = ['top', 'left', 'right'] as const;

export function MenuTabScreen({ route }: Props) {
  return (
    <ScreenPlaceholder
      name="Menu"
      edges={EDGES}
      description={`Browse the restaurant menu and add items in lobby ${route.params.lobbyCode}.`}
    />
  );
}
