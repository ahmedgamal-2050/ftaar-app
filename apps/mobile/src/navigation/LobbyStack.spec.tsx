import * as React from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { act, render, screen } from '@testing-library/react-native';
import { LobbyStack } from './LobbyStack';
import type { LobbyStackParamList } from './types';

const LOBBY_CODE = 'FTAAR1';

function renderLobbyStack() {
  const ref = createNavigationContainerRef<LobbyStackParamList>();
  render(
    <NavigationContainer ref={ref}>
      <LobbyStack />
    </NavigationContainer>,
  );
  return ref;
}

describe('LobbyStack', () => {
  it('starts on LobbySetup', () => {
    renderLobbyStack();

    expect(screen.getByTestId('placeholder-LobbySetup')).toBeTruthy();
  });

  it('resolves every lobby-scoped route', () => {
    const ref = renderLobbyStack();

    const routes = [
      'LobbyShare',
      'OrderSummary',
      'BillEntry',
      'BillReview',
      'PaymentBoard',
      'LobbySettled',
    ] as const;

    for (const route of routes) {
      act(() => ref.navigate(route, { lobbyCode: LOBBY_CODE }));
      expect(screen.getByTestId(`placeholder-${route}`)).toBeTruthy();
    }
  });

  it('opens LobbyRoom on its Menu sub-tab', () => {
    const ref = renderLobbyStack();

    act(() => ref.navigate('LobbyRoom', { lobbyCode: LOBBY_CODE }));

    expect(screen.getByTestId('placeholder-Menu')).toBeTruthy();
  });

  it('keeps Menu / MyCart / Group as LobbyRoom sub-tabs', () => {
    const ref = renderLobbyStack();

    act(() => ref.navigate('LobbyRoom', { lobbyCode: LOBBY_CODE }));

    const lobbyRoomState = ref
      .getRootState()
      ?.routes.find((route) => route.name === 'LobbyRoom')?.state;
    expect(lobbyRoomState?.routes.map((route) => route.name)).toEqual([
      'Menu',
      'MyCart',
      'Group',
    ]);
  });

  it('passes the lobby code down to the sub-tabs', () => {
    const ref = renderLobbyStack();

    act(() => ref.navigate('LobbyRoom', { lobbyCode: LOBBY_CODE }));

    expect(
      screen.getByText(
        `Browse the restaurant menu and add items in lobby ${LOBBY_CODE}.`,
      ),
    ).toBeTruthy();
  });
});
