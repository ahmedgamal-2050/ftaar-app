import React from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { LobbyRoomTabParamList } from '../../../navigation/types';
import { ScreenPlaceholder } from '../../../ui';

type Props = BottomTabScreenProps<LobbyRoomTabParamList, 'MyCart'>;

const EDGES = ['top', 'left', 'right'] as const;

export function MyCartTabScreen({ route }: Props) {
  return (
    <ScreenPlaceholder
      name="MyCart"
      edges={EDGES}
      description={`What the current member is ordering in lobby ${route.params.lobbyCode}.`}
    />
  );
}
