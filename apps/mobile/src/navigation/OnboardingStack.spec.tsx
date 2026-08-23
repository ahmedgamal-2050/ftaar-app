import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { OnboardingStack } from './OnboardingStack';

const mockCompleteOnboarding = jest.fn();

jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ completeOnboarding: mockCompleteOnboarding }),
}));

describe('OnboardingStack', () => {
  it('starts on Welcome and reaches ChooseName', () => {
    render(
      <NavigationContainer>
        <OnboardingStack />
      </NavigationContainer>,
    );

    expect(screen.getByTestId('placeholder-Welcome')).toBeTruthy();
    fireEvent.press(screen.getByText('ChooseName'));
    expect(screen.getByTestId('placeholder-ChooseName')).toBeTruthy();
  });

  it('registers only Welcome and ChooseName', () => {
    render(
      <NavigationContainer>
        <OnboardingStack />
      </NavigationContainer>,
    );

    expect(screen.queryByTestId('placeholder-Login')).toBeNull();
    expect(screen.queryByText('Login')).toBeNull();
  });
});
