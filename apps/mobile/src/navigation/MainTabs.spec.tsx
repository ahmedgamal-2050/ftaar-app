import * as React from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { act, render, screen } from '@testing-library/react-native';
import { MainTabs } from './MainTabs';
import type { MainTabParamList } from './types';
// Initialises the shared i18next instance so tab labels resolve to real copy
// instead of raw keys.
import '../i18n';

const mockAuthUser = {
  current: { isGuest: false } as { isGuest: boolean } | null,
};

jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    status: 'ready',
    user: mockAuthUser.current
      ? { displayName: 'Mohamed Salah', ...mockAuthUser.current }
      : null,
    logout: jest.fn(),
  }),
}));

function renderTabs() {
  const ref = createNavigationContainerRef<MainTabParamList>();
  render(
    <NavigationContainer ref={ref}>
      <MainTabs />
    </NavigationContainer>,
  );
  return ref;
}

beforeEach(() => {
  mockAuthUser.current = { isGuest: false };
});

describe('the bottom tab bar', () => {
  it('has exactly four entries, in order', () => {
    const ref = renderTabs();

    expect(ref.getRootState()?.routes.map((route) => route.name)).toEqual([
      'Home',
      'History',
      'Restaurants',
      'Profile',
    ]);
  });

  it('labels them Home / History / Restaurants / Profile', () => {
    renderTabs();

    for (const label of ['Home', 'History', 'Restaurants', 'Profile']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('has no Groups tab — the group view lives inside LobbyRoom', () => {
    renderTabs();

    expect(screen.queryByText('Groups')).toBeNull();
  });
});

describe('routes inside the tabs', () => {
  it('reaches every Home and History route', () => {
    const ref = renderTabs();

    act(() => ref.navigate('Home', { screen: 'JoinByCode' }));
    expect(screen.getByTestId('placeholder-JoinByCode')).toBeTruthy();

    act(() => ref.navigate('History', { screen: 'MyLobbies' }));
    expect(screen.getByTestId('placeholder-MyLobbies')).toBeTruthy();
  });

  it('reaches every Restaurants route for a registered user', () => {
    const ref = renderTabs();

    act(() => ref.navigate('Restaurants', { screen: 'RestaurantList' }));
    expect(screen.getByTestId('placeholder-RestaurantList')).toBeTruthy();

    act(() => ref.navigate('Restaurants', { screen: 'RestaurantForm' }));
    expect(screen.getByTestId('placeholder-RestaurantForm')).toBeTruthy();

    act(() =>
      ref.navigate('Restaurants', {
        screen: 'MenuManager',
        params: { restaurantId: 'r1' },
      }),
    );
    expect(screen.getByTestId('placeholder-MenuManager')).toBeTruthy();

    act(() =>
      ref.navigate('Restaurants', {
        screen: 'BulkMenuPaste',
        params: { restaurantId: 'r1' },
      }),
    );
    expect(screen.getByTestId('placeholder-BulkMenuPaste')).toBeTruthy();
  });

  it('keeps the Restaurants routes registered for guests too', () => {
    mockAuthUser.current = { isGuest: true };
    const ref = renderTabs();

    act(() =>
      ref.navigate('Restaurants', {
        screen: 'MenuManager',
        params: { restaurantId: 'r1' },
      }),
    );

    expect(screen.getByTestId('placeholder-MenuManager')).toBeTruthy();
  });

  it('reaches every Profile route', () => {
    const ref = renderTabs();

    act(() => ref.navigate('Profile', { screen: 'Register' }));
    expect(screen.getByTestId('placeholder-Register')).toBeTruthy();

    act(() => ref.navigate('Profile', { screen: 'Login' }));
    expect(screen.getByTestId('placeholder-Login')).toBeTruthy();

    act(() => ref.navigate('Profile', { screen: 'ForgotPasswordStub' }));
    expect(screen.getByTestId('placeholder-ForgotPasswordStub')).toBeTruthy();
  });
});
