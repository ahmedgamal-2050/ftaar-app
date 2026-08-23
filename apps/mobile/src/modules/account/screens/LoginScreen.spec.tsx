import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { LoginScreen } from './LoginScreen';
import type { ProfileStackParamList } from '../../../navigation/types';

const mockLogin = jest.fn();

jest.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

const Stack = createNativeStackNavigator<ProfileStackParamList>();

describe('LoginScreen', () => {
  it('renders its name and continues the local session', () => {
    render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      </NavigationContainer>,
    );

    expect(screen.getByTestId('placeholder-Login')).toBeTruthy();
    fireEvent.press(screen.getByText('Continue'));
    expect(mockLogin).toHaveBeenCalled();
  });
});
