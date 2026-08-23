import * as React from 'react';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { AuthProvider, useAuth } from './AuthContext';

function Probe() {
  const { status, user, completeOnboarding, login, logout } = useAuth();
  return (
    <>
      <Text testID="status">{status}</Text>
      <Text testID="name">{user?.displayName ?? ''}</Text>
      <Text testID="guest">{user ? String(user.isGuest) : ''}</Text>
      <Text testID="onboard" onPress={() => void completeOnboarding('Layla')}>
        onboard
      </Text>
      <Text testID="login" onPress={() => void login()}>
        login
      </Text>
      <Text testID="logout" onPress={() => void logout()}>
        logout
      </Text>
    </>
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('AuthContext', () => {
  it('needs onboarding when no local session exists', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent(
        'needs-onboarding',
      ),
    );
  });

  it('stores a guest session from completeOnboarding', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent(
        'needs-onboarding',
      ),
    );
    fireEvent.press(screen.getByTestId('onboard'));

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('ready'),
    );
    expect(screen.getByTestId('name')).toHaveTextContent('Layla');
    expect(screen.getByTestId('guest')).toHaveTextContent('true');
  });

  it('marks the same session as registered on login', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent(
        'needs-onboarding',
      ),
    );
    fireEvent.press(screen.getByTestId('onboard'));
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('ready'),
    );
    fireEvent.press(screen.getByTestId('login'));

    await waitFor(() =>
      expect(screen.getByTestId('guest')).toHaveTextContent('false'),
    );
    expect(screen.getByTestId('name')).toHaveTextContent('Layla');
  });

  it('returns to onboarding after logout', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent(
        'needs-onboarding',
      ),
    );
    fireEvent.press(screen.getByTestId('onboard'));
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('ready'),
    );
    fireEvent.press(screen.getByTestId('logout'));

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent(
        'needs-onboarding',
      ),
    );
  });
});
