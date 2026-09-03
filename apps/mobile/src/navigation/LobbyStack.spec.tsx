import * as React from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { act, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LobbyStack } from './LobbyStack';
import type { LobbyStackParamList } from './types';
// Initialises the shared i18next instance so real screens render translated
// copy instead of raw keys.
import '../i18n';

const LOBBY_CODE = 'FTAAR1';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const LOBBY_ID = '22222222-2222-4222-8222-222222222222';
const RESTAURANT_ID = '33333333-3333-4333-8333-333333333333';
const ADMIN_MEMBER_ID = '44444444-4444-4444-8444-444444444444';
const REGULAR_USER_ID = '66666666-6666-4666-8666-666666666666';
const REGULAR_MEMBER_ID = '77777777-7777-4777-8777-777777777777';

const mockUser = {
  current: {
    id: USER_ID,
    displayName: 'Ahmed',
    email: null,
    isGuest: false,
    instaPayHandle: null,
  } as { id: string; displayName: string } | null,
};

jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: mockUser.current }),
}));

const FIXTURE_LOBBY = {
  id: LOBBY_ID,
  restaurantId: RESTAURANT_ID,
  code: LOBBY_CODE,
  status: 'open' as const,
  maxMembers: null,
  expiresAt: null,
  instaPayHandle: null,
  memberCount: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  restaurant: { id: RESTAURANT_ID, name: 'Foul & Ta3meya Co.', isActive: true },
  members: [
    {
      id: ADMIN_MEMBER_ID,
      lobbyId: LOBBY_ID,
      userId: USER_ID,
      role: 'admin' as const,
      displayName: 'Ahmed',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: REGULAR_MEMBER_ID,
      lobbyId: LOBBY_ID,
      userId: REGULAR_USER_ID,
      role: 'member' as const,
      displayName: 'Sarah',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

const mockGetByCode = jest.fn(() => Promise.resolve(FIXTURE_LOBBY));

jest.mock('../api/endpoints/lobbies', () => ({
  lobbiesApi: {
    getByCode: (...args: unknown[]) =>
      (mockGetByCode as (...a: unknown[]) => unknown)(...args),
    getById: (...args: unknown[]) =>
      (mockGetByCode as (...a: unknown[]) => unknown)(...args),
  },
}));

const FIXTURE_MENU_ITEM = {
  id: '55555555-5555-4555-8555-555555555555',
  restaurantId: RESTAURANT_ID,
  name: 'Foul',
  category: 'Mains',
  referencePrice: '20.00',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

jest.mock('../api/endpoints/menu', () => ({
  menuApi: { list: jest.fn(() => Promise.resolve([FIXTURE_MENU_ITEM])) },
}));

const mockGetSummary = jest.fn(() =>
  Promise.resolve({
    lobbyId: LOBBY_ID,
    totalItemsCount: 4,
    grandTotal: '70.00',
    items: [
      {
        menuItemId: FIXTURE_MENU_ITEM.id,
        name: 'Foul',
        category: 'Mains',
        totalQty: 3,
        unitPrice: '20.00',
        totalPrice: '60.00',
      },
      {
        menuItemId: '88888888-8888-4888-8888-888888888888',
        name: 'Tea',
        category: 'Drinks',
        totalQty: 1,
        unitPrice: '10.00',
        totalPrice: '10.00',
      },
    ],
  }),
);

jest.mock('../api/endpoints/orders', () => ({
  ordersApi: {
    findMine: jest.fn(() => Promise.resolve({ items: [], subtotal: '0.00' })),
    listForLobby: jest.fn(() =>
      Promise.resolve({ lobbyId: LOBBY_ID, items: [], subtotal: '0.00' }),
    ),
    getSummary: (...args: unknown[]) =>
      (mockGetSummary as (...a: unknown[]) => unknown)(...args),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

function renderLobbyStack() {
  const ref = createNavigationContainerRef<LobbyStackParamList>();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer ref={ref}>
        <LobbyStack />
      </NavigationContainer>
    </QueryClientProvider>,
  );
  return ref;
}

describe('LobbyStack', () => {
  beforeEach(() => {
    mockUser.current = {
      id: USER_ID,
      displayName: 'Ahmed',
      email: null,
      isGuest: false,
      instaPayHandle: null,
    };
  });

  it('starts on LobbySetup', () => {
    renderLobbyStack();

    expect(screen.getByTestId('placeholder-LobbySetup')).toBeTruthy();
  });

  it('resolves every still-placeholder lobby-scoped route', () => {
    const ref = renderLobbyStack();

    const routes = [
      'LobbyShare',
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

  it("opens LobbyRoom on its Menu tab and loads the lobby's restaurant menu", async () => {
    const ref = renderLobbyStack();

    act(() => ref.navigate('LobbyRoom', { lobbyCode: LOBBY_CODE }));

    expect(await screen.findByText('Foul & Ta3meya Co.')).toBeTruthy();
    expect(await screen.findByText('Foul')).toBeTruthy();
    expect(await screen.findByText('EGP 20.00')).toBeTruthy();
  });

  it('shows the host the merged order summary for reading to the restaurant', async () => {
    const ref = renderLobbyStack();

    act(() => ref.navigate('OrderSummary', { lobbyCode: LOBBY_CODE }));

    expect(await screen.findByText('x3')).toBeTruthy();
    expect(await screen.findByText('EGP 60.00')).toBeTruthy();
    expect(await screen.findByText('EGP 70.00')).toBeTruthy();
  });

  it('hides the merged order summary from a regular member', async () => {
    mockGetSummary.mockClear();
    mockUser.current = {
      id: REGULAR_USER_ID,
      displayName: 'Sarah',
      email: null,
      isGuest: false,
      instaPayHandle: null,
    };
    const ref = renderLobbyStack();

    act(() => ref.navigate('OrderSummary', { lobbyCode: LOBBY_CODE }));

    expect(await screen.findByText('Host only')).toBeTruthy();
    expect(mockGetSummary).not.toHaveBeenCalled();
  });
});
