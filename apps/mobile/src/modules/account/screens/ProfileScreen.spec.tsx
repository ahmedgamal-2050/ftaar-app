import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ProfileScreen } from './ProfileScreen';
import type { ProfileStackParamList } from '../../../navigation/types';
// Initialises the shared i18next instance so copy renders instead of raw keys.
import '../../../i18n';

const mockLogout = jest.fn();
const mockAuthUser = {
  current: { displayName: 'Mohamed Salah', isGuest: true },
};

jest.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: mockAuthUser.current, logout: mockLogout }),
}));

const Stack = createNativeStackNavigator<ProfileStackParamList>();

function renderScreen() {
  render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

beforeEach(() => {
  mockLogout.mockReset();
});

describe('ProfileScreen', () => {
  it('renders initials instead of a photo and a guest conversion card', () => {
    mockAuthUser.current = { displayName: 'Mohamed Salah', isGuest: true };
    renderScreen();

    expect(screen.getByTestId('screen-ProfileScreen')).toBeTruthy();
    expect(screen.getByText('MS')).toBeTruthy();
    expect(screen.getByTestId('profile-register-cta')).toBeTruthy();
  });

  it('hides the guest conversion card for a registered user', () => {
    mockAuthUser.current = { displayName: 'Mohamed Salah', isGuest: false };
    renderScreen();

    expect(screen.queryByTestId('profile-register-cta')).toBeNull();
  });

  it('logs out when Log out is pressed', () => {
    mockAuthUser.current = { displayName: 'Mohamed Salah', isGuest: true };
    renderScreen();

    fireEvent.press(screen.getByTestId('profile-logout'));

    expect(mockLogout).toHaveBeenCalled();
  });
});
