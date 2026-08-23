import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList, RootStackParamList } from '../../../navigation/types';
import { PlaceholderLinks, ScreenPlaceholder } from '../../../ui';

export function HomeScreen() {
  const homeNavigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScreenPlaceholder name="HomeScreen" description="Create a lobby or join one by code.">
      <PlaceholderLinks
        links={[
          { label: 'JoinByCode', onPress: () => homeNavigation.navigate('JoinByCode') },
          {
            label: 'LobbySetup',
            onPress: () => rootNavigation.navigate('LobbyStack', { screen: 'LobbySetup' }),
          },
        ]}
      />
    </ScreenPlaceholder>
  );
}
