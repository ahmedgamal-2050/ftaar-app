import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import type { LobbyStackParamList } from '../../../navigation/types';
import type { SessionUser } from '../../../auth/session';
import { LobbySetupScreen } from './LobbySetupScreen';

const RESTAURANT_A = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Foul & Felafel',
  phone: '+201001111111',
  image: '',
  note: '34 items',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const RESTAURANT_B = {
  ...RESTAURANT_A,
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Zooba',
  note: null,
};

const mockUser = {
  current: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    displayName: 'Ahmed',
    email: 'ahmed@example.com',
    isGuest: false,
    instaPayHandle: 'ahmed.gamal',
  } as SessionUser | null,
};

jest.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: mockUser.current }),
}));

const mockListRestaurants = jest.fn();
jest.mock('../../../api/endpoints/restaurants', () => ({
  restaurantsApi: {
    list: (...args: unknown[]) => mockListRestaurants(...args),
  },
}));

const mockCreateLobby = jest.fn();
jest.mock('../../../api/endpoints/lobbies', () => ({
  lobbiesApi: {
    create: (...args: unknown[]) => mockCreateLobby(...args),
  },
}));

const Stack = createNativeStackNavigator<LobbyStackParamList>();

function ShareStub() {
  return null;
}

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="LobbySetup" component={LobbySetupScreen} />
          <Stack.Screen name="LobbyShare" component={ShareStub} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockUser.current = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    displayName: 'Ahmed',
    email: 'ahmed@example.com',
    isGuest: false,
    instaPayHandle: 'ahmed.gamal',
  };
  mockListRestaurants.mockReset();
  mockCreateLobby.mockReset();
  mockListRestaurants.mockResolvedValue({
    items: [RESTAURANT_A, RESTAURANT_B],
    page: 1,
    limit: 20,
    total: 2,
  });
});

describe('LobbySetupScreen', () => {
  it('keeps publish disabled until a restaurant is chosen', async () => {
    renderScreen();

    expect(await screen.findByText('Foul & Felafel')).toBeTruthy();
    expect(
      screen.getByTestId('publish-lobby-button').props.accessibilityState
        .disabled,
    ).toBe(true);
  });

  it('lets the host switch restaurants freely before publish', async () => {
    renderScreen();
    await screen.findByText('Foul & Felafel');

    fireEvent.press(screen.getByTestId(`lobby-restaurant-${RESTAURANT_A.id}`));
    fireEvent.press(screen.getByTestId(`lobby-restaurant-${RESTAURANT_B.id}`));

    expect(
      screen.getByTestId('publish-lobby-button').props.accessibilityState
        .disabled,
    ).toBe(false);
  });

  it('publishes a registered host as the lobby creator without asking for a handle', async () => {
    mockCreateLobby.mockResolvedValue({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      code: 'BKFST1',
      restaurantId: RESTAURANT_A.id,
      status: 'open',
      members: [{ userId: mockUser.current?.id, role: 'admin' }],
    });
    renderScreen();
    await screen.findByText('Foul & Felafel');

    expect(screen.queryByTestId('lobby-payment-handle')).toBeNull();

    fireEvent.press(screen.getByTestId(`lobby-restaurant-${RESTAURANT_A.id}`));
    fireEvent.changeText(screen.getByTestId('lobby-max-members'), '8');
    fireEvent.changeText(screen.getByTestId('lobby-cutoff-time'), '09:45');
    fireEvent.press(screen.getByTestId('publish-lobby-button'));

    await waitFor(() =>
      expect(mockCreateLobby).toHaveBeenCalledWith({
        restaurantId: RESTAURANT_A.id,
        maxMembers: 8,
        expiresAt: expect.any(String),
        instaPayHandle: 'ahmed.gamal',
      }),
    );
  });

  it('asks a guest for a payment handle and blocks publish until one is entered', async () => {
    mockUser.current = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
      displayName: 'Guest',
      email: null,
      isGuest: true,
      instaPayHandle: null,
    };
    renderScreen();
    await screen.findByText('Foul & Felafel');

    fireEvent.press(screen.getByTestId(`lobby-restaurant-${RESTAURANT_A.id}`));
    fireEvent.press(screen.getByTestId('publish-lobby-button'));

    expect(
      await screen.findByText(
        'Enter a valid InstaPay handle (3–50 letters, numbers, dots, underscores, or hyphens).',
      ),
    ).toBeTruthy();
    expect(mockCreateLobby).not.toHaveBeenCalled();
  });

  it('publishes a guest lobby once a payment handle is entered', async () => {
    mockUser.current = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
      displayName: 'Guest',
      email: null,
      isGuest: true,
      instaPayHandle: null,
    };
    mockCreateLobby.mockResolvedValue({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      code: 'FALAF1',
      restaurantId: RESTAURANT_A.id,
      status: 'open',
      members: [{ role: 'admin' }],
    });
    renderScreen();
    await screen.findByText('Foul & Felafel');

    fireEvent.press(screen.getByTestId(`lobby-restaurant-${RESTAURANT_A.id}`));
    fireEvent.changeText(
      screen.getByTestId('lobby-payment-handle'),
      'guest.handle',
    );
    fireEvent.press(screen.getByTestId('publish-lobby-button'));

    await waitFor(() =>
      expect(mockCreateLobby).toHaveBeenCalledWith({
        restaurantId: RESTAURANT_A.id,
        instaPayHandle: 'guest.handle',
      }),
    );
  });

  it('rejects a member cap below 2', async () => {
    renderScreen();
    await screen.findByText('Foul & Felafel');

    fireEvent.press(screen.getByTestId(`lobby-restaurant-${RESTAURANT_A.id}`));
    fireEvent.changeText(screen.getByTestId('lobby-max-members'), '1');
    fireEvent.press(screen.getByTestId('publish-lobby-button'));

    expect(
      await screen.findByText('Maximum members must be at least 2.'),
    ).toBeTruthy();
    expect(mockCreateLobby).not.toHaveBeenCalled();
  });

  it('rejects a malformed cut-off time', async () => {
    renderScreen();
    await screen.findByText('Foul & Felafel');

    fireEvent.press(screen.getByTestId(`lobby-restaurant-${RESTAURANT_A.id}`));
    fireEvent.changeText(screen.getByTestId('lobby-cutoff-time'), '99:99');
    fireEvent.press(screen.getByTestId('publish-lobby-button'));

    expect(
      await screen.findByText('Enter the cut-off time as HH:MM.'),
    ).toBeTruthy();
    expect(mockCreateLobby).not.toHaveBeenCalled();
  });

  it('explains when the original backend rejects a guest publisher', async () => {
    mockUser.current = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
      displayName: 'Guest',
      email: null,
      isGuest: true,
      instaPayHandle: null,
    };
    mockCreateLobby.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          success: false,
          error: { code: 'GUEST_NOT_ALLOWED', message: 'Registered only' },
        },
      },
    });
    renderScreen();
    await screen.findByText('Foul & Felafel');

    fireEvent.press(screen.getByTestId(`lobby-restaurant-${RESTAURANT_A.id}`));
    fireEvent.changeText(
      screen.getByTestId('lobby-payment-handle'),
      'guest.handle',
    );
    fireEvent.press(screen.getByTestId('publish-lobby-button'));

    expect(
      await screen.findByText('Create an account to publish a lobby.'),
    ).toBeTruthy();
  });
});
