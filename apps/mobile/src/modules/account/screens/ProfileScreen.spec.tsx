import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { render, screen } from '@testing-library/react-native';
import { ProfileScreen } from './ProfileScreen';
import type { ProfileStackParamList } from '../../../navigation/types';

jest.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { displayName: 'Mohamed Salah', isGuest: true },
    logout: jest.fn(),
  }),
}));

const Stack = createNativeStackNavigator<ProfileStackParamList>();

describe('ProfileScreen', () => {
  it('renders initials instead of a photo and the account routes', () => {
    render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
        </Stack.Navigator>
      </NavigationContainer>,
    );

    expect(screen.getByTestId('placeholder-ProfileScreen')).toBeTruthy();
    expect(screen.getByText('MS')).toBeTruthy();
    expect(screen.getByText('Register')).toBeTruthy();
    expect(screen.getByText('Login')).toBeTruthy();
    expect(screen.getByText('ForgotPasswordStub')).toBeTruthy();
  });
});
