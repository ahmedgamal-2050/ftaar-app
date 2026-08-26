import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import App from './App';

// The factory runs at require-time, before this file's own top-level `const`s
// are initialised — the mock object must be created inside the factory, not
// referenced from an outer `const`, or it evaluates to undefined.
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
  authApi: { bootstrapGuest: jest.Mock; refresh: jest.Mock };
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  // The steady state for a fresh device: no session to resume.
  mockAuthApi.refresh.mockRejectedValue(new Error('no stored session'));
});

test('a fresh install lands on the Welcome screen', async () => {
  render(<App />);

  await waitFor(() =>
    expect(screen.getByTestId('screen-Welcome')).toBeTruthy(),
  );
});

test('ChooseName continues into the four-tab shell', async () => {
  mockAuthApi.bootstrapGuest.mockResolvedValue({
    accessToken: 'access-token',
    refreshToken: 'family:token',
    user: {
      id: 'user-1',
      kind: 'guest',
      email: null,
      displayName: 'Guest',
      instaPayHandle: null,
      emailVerifiedAt: null,
    },
  });

  render(<App />);

  await waitFor(() =>
    expect(screen.getByTestId('screen-Welcome')).toBeTruthy(),
  );
  fireEvent.press(screen.getByTestId('welcome-get-started'));

  await waitFor(() =>
    expect(screen.getByTestId('screen-ChooseName')).toBeTruthy(),
  );
  fireEvent.changeText(screen.getByTestId('choose-name-input'), 'Layla');
  fireEvent.press(screen.getByTestId('choose-name-continue'));

  await waitFor(() =>
    expect(screen.getByTestId('placeholder-HomeScreen')).toBeTruthy(),
  );
  expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
  expect(screen.getAllByText('History').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Restaurants').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Profile').length).toBeGreaterThan(0);
});
