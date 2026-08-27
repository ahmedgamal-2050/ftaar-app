import * as React from 'react';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { AuthProvider, useAuth } from './AuthContext';

// The factory runs at require-time (before this file's own top-level `const`s
// are initialised, since the hoisted `import` above pulls it in first) — the
// mock object must be created inside the factory, not referenced from an
// outer `const`, or it evaluates to undefined.
jest.mock('../api/endpoints/auth', () => ({
  authApi: {
    bootstrapGuest: jest.fn(),
    refresh: jest.fn(),
    login: jest.fn(),
    convert: jest.fn(),
    updateMe: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
  },
}));

const { authApi: mockAuthApi } = jest.requireMock('../api/endpoints/auth') as {
  authApi: {
    bootstrapGuest: jest.Mock;
    refresh: jest.Mock;
    login: jest.Mock;
    convert: jest.Mock;
    updateMe: jest.Mock;
    logout: jest.Mock;
    getMe: jest.Mock;
  };
};

function Probe() {
  const { status, user, completeOnboarding, login, register, logout } =
    useAuth();
  return (
    <>
      <Text testID="status">{status}</Text>
      <Text testID="name">{user?.displayName ?? ''}</Text>
      <Text testID="guest">{user ? String(user.isGuest) : ''}</Text>
      <Text testID="onboard" onPress={() => void completeOnboarding('Layla')}>
        onboard
      </Text>
      <Text
        testID="login"
        onPress={() => void login('layla@example.com', 'Str0ng!Pass')}
      >
        login
      </Text>
      <Text
        testID="register"
        onPress={() => void register('layla@example.com', 'Str0ng!Pass')}
      >
        register
      </Text>
      <Text testID="logout" onPress={() => void logout()}>
        logout
      </Text>
    </>
  );
}

function backendUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    kind: 'guest',
    email: null,
    displayName: 'Guest',
    instaPayHandle: null,
    emailVerifiedAt: null,
    ...overrides,
  };
}

function backendSession(userOverrides: Record<string, unknown> = {}) {
  return {
    accessToken: 'access-token',
    refreshToken: 'family:token',
    user: backendUser(userOverrides),
  };
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await SecureStore.deleteItemAsync('ftaar.refreshToken');
  // The steady state for a fresh device: no session to resume.
  mockAuthApi.refresh.mockRejectedValue(new Error('no stored session'));
});

describe('AuthContext', () => {
  it('needs onboarding when no refresh token is stored', async () => {
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
    expect(mockAuthApi.refresh).not.toHaveBeenCalled();
  });

  it('bootstraps a guest session and keeps the typed display name', async () => {
    mockAuthApi.bootstrapGuest.mockResolvedValue(backendSession());
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
    // The backend hardcodes displayName='Guest' for new guests — the typed
    // name only lives client-side until conversion.
    expect(screen.getByTestId('name')).toHaveTextContent('Layla');
    expect(screen.getByTestId('guest')).toHaveTextContent('true');
  });

  it('resumes a stored guest session on relaunch via refresh', async () => {
    await SecureStore.setItemAsync('ftaar.refreshToken', 'family:token');
    mockAuthApi.refresh.mockResolvedValue(backendSession());

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('ready'),
    );
    expect(mockAuthApi.refresh).toHaveBeenCalledWith('family:token');
  });

  it('converts the guest to a registered account and syncs the carried-over name', async () => {
    mockAuthApi.bootstrapGuest.mockResolvedValue(backendSession());
    mockAuthApi.convert.mockResolvedValue(
      backendSession({ kind: 'registered', email: 'layla@example.com' }),
    );
    mockAuthApi.updateMe.mockResolvedValue(
      backendUser({
        kind: 'registered',
        email: 'layla@example.com',
        displayName: 'Layla',
      }),
    );

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

    fireEvent.press(screen.getByTestId('register'));

    await waitFor(() =>
      expect(screen.getByTestId('guest')).toHaveTextContent('false'),
    );
    expect(mockAuthApi.updateMe).toHaveBeenCalledWith({
      displayName: 'Layla',
    });
    expect(screen.getByTestId('name')).toHaveTextContent('Layla');
  });

  it('logs in with real credentials', async () => {
    mockAuthApi.login.mockResolvedValue(
      backendSession({
        kind: 'registered',
        email: 'layla@example.com',
        displayName: 'Layla',
      }),
    );

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

    fireEvent.press(screen.getByTestId('login'));

    await waitFor(() =>
      expect(screen.getByTestId('guest')).toHaveTextContent('false'),
    );
    expect(mockAuthApi.login).toHaveBeenCalledWith({
      email: 'layla@example.com',
      password: 'Str0ng!Pass',
    });
    expect(screen.getByTestId('name')).toHaveTextContent('Layla');
  });

  it('returns to onboarding after logout', async () => {
    mockAuthApi.bootstrapGuest.mockResolvedValue(backendSession());
    mockAuthApi.logout.mockResolvedValue(undefined);

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
    expect(mockAuthApi.logout).toHaveBeenCalled();
  });
});
