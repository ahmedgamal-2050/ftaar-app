import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LobbyStackParamList } from '../../../navigation/types';
import { ScreenPlaceholder } from '../../../ui';

type Props = NativeStackScreenProps<LobbyStackParamList, 'LobbySettled'>;

export function LobbySettledScreen({ route }: Props) {
  return (
    <ScreenPlaceholder
      name="LobbySettled"
      description={`Everyone has paid — lobby ${route.params.lobbyCode} is closed.`}
    />
  );
}
