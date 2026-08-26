import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { OnboardingStack } from './OnboardingStack';
// Initialises the shared i18next instance so copy renders instead of raw keys.
import '../i18n';

const mockCompleteOnboarding = jest.fn();
const mockLogin = jest.fn();

jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    completeOnboarding: mockCompleteOnboarding,
    login: mockLogin,
  }),
}));

describe('OnboardingStack', () => {
  it('starts on Welcome and reaches ChooseName', () => {
    render(
      <NavigationContainer>
        <OnboardingStack />
      </NavigationContainer>,
    );

    expect(screen.getByTestId('screen-Welcome')).toBeTruthy();
    fireEvent.press(screen.getByTestId('welcome-get-started'));
    expect(screen.getByTestId('screen-ChooseName')).toBeTruthy();
  });

  it('reaches Login from Welcome\'s "already have an account" link, for a device with no session at all', () => {
    render(
      <NavigationContainer>
        <OnboardingStack />
      </NavigationContainer>,
    );

    expect(screen.queryByTestId('screen-Login')).toBeNull();
    fireEvent.press(screen.getByTestId('welcome-login-link'));
    expect(screen.getByTestId('screen-Login')).toBeTruthy();
  });

  it('does not mount Login or ForgotPassword until navigated to', () => {
    render(
      <NavigationContainer>
        <OnboardingStack />
      </NavigationContainer>,
    );

    expect(screen.queryByTestId('screen-Login')).toBeNull();
    expect(screen.queryByTestId('screen-ForgotPassword')).toBeNull();
  });

  it('reaches ForgotPassword from Login, for a device with no session at all', () => {
    render(
      <NavigationContainer>
        <OnboardingStack />
      </NavigationContainer>,
    );

    fireEvent.press(screen.getByTestId('welcome-login-link'));
    fireEvent.press(screen.getByTestId('login-forgot-password'));
    expect(screen.getByTestId('screen-ForgotPassword')).toBeTruthy();
  });
});
