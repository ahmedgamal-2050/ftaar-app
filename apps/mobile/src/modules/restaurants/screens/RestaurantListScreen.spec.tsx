import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { render, screen } from '@testing-library/react-native';
import { RestaurantListScreen } from './RestaurantListScreen';
import type { RestaurantsStackParamList } from '../../../navigation/types';
// Initialises the shared i18next instance so the locked notice renders real
// copy instead of raw keys.
import '../../../i18n';

const mockAuthUser = {
  current: { isGuest: false } as { isGuest: boolean } | null,
};

jest.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: mockAuthUser.current }),
}));

const Stack = createNativeStackNavigator<RestaurantsStackParamList>();

function renderScreen() {
  render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="RestaurantList" component={RestaurantListScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe('RestaurantListScreen', () => {
  it('locks the tab for guests instead of sending them to another route', () => {
    mockAuthUser.current = { isGuest: true };

    renderScreen();

    expect(
      screen.getByText('Restaurants are read-only for guests'),
    ).toBeTruthy();
    expect(screen.getByTestId('placeholder-RestaurantList')).toBeTruthy();
  });

  it('locks the tab when there is no user at all', () => {
    mockAuthUser.current = null;

    renderScreen();

    expect(
      screen.getByText('Restaurants are read-only for guests'),
    ).toBeTruthy();
  });

  it('shows the list for a registered user', () => {
    mockAuthUser.current = { isGuest: false };

    renderScreen();

    expect(screen.getByTestId('placeholder-RestaurantList')).toBeTruthy();
  });
});
