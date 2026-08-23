import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LobbyStackParamList } from '../../../navigation/types';
import { PlaceholderLinks, ScreenPlaceholder } from '../../../ui';

type Props = NativeStackScreenProps<LobbyStackParamList, 'BillEntry'>;

export function BillEntryScreen({ navigation, route }: Props) {
  const { lobbyCode } = route.params;

  return (
    <ScreenPlaceholder
      name="BillEntry"
      description={`Enter the real bill totals for lobby ${lobbyCode}.`}
    >
      <PlaceholderLinks
        links={[
          { label: 'BillReview', onPress: () => navigation.navigate('BillReview', { lobbyCode }) },
        ]}
      />
    </ScreenPlaceholder>
  );
}
