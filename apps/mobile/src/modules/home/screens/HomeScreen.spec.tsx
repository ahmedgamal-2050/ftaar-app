import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { render, screen } from '@testing-library/react-native';
import { HomeScreen } from './HomeScreen';
import type { HomeStackParamList } from '../../../navigation/types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

describe('HomeScreen', () => {
  it('renders its route name and the two outbound links', () => {
    render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="HomeScreen" component={HomeScreen} />
        </Stack.Navigator>
      </NavigationContainer>,
    );

    expect(screen.getByTestId('placeholder-HomeScreen')).toBeTruthy();
    expect(screen.getByText('JoinByCode')).toBeTruthy();
    expect(screen.getByText('LobbySetup')).toBeTruthy();
  });
});
