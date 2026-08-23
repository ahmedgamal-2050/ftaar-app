import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { render, screen } from '@testing-library/react-native';
import { JoinByCodeScreen } from './JoinByCodeScreen';
import { SAMPLE_LOBBY_CODE } from '../../lobby/lobbySample';
import type { HomeStackParamList } from '../../../navigation/types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

describe('JoinByCodeScreen', () => {
  it('renders the lobby code with LtrText', () => {
    render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="JoinByCode" component={JoinByCodeScreen} />
        </Stack.Navigator>
      </NavigationContainer>,
    );

    expect(screen.getByTestId('placeholder-JoinByCode')).toBeTruthy();
    expect(screen.getByText(SAMPLE_LOBBY_CODE)).toHaveStyle({
      writingDirection: 'ltr',
    });
    expect(screen.getByText('LobbyRoom')).toBeTruthy();
  });
});
