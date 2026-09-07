import * as React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { BillEntryScreen } from './BillEntryScreen';
import type { LobbyStackParamList } from '../../../navigation/types';
// Initialises the shared i18next instance so assertions read real copy.
import '../../../i18n';

const LOBBY_CODE = 'FTAAR1';
const LOBBY_ID = 'lobby-1';
const ADMIN_USER_ID = 'user-a';
const MEMBER_USER_ID = 'user-b';
const FOUL = 'menu-foul';
const TEA = 'menu-tea';

const mockUser = { current: { id: ADMIN_USER_ID } as { id: string } };

jest.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: mockUser.current }),
}));

const lobbyStatus = { current: 'locked' };

jest.mock('../../../api/endpoints/lobbies', () => ({
  lobbiesApi: {
    getByCode: () =>
      Promise.resolve({
        id: LOBBY_ID,
        restaurantId: 'restaurant-1',
        code: LOBBY_CODE,
        status: lobbyStatus.current,
        maxMembers: null,
        expiresAt: null,
        instaPayHandle: null,
        memberCount: 2,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        restaurant: { id: 'restaurant-1', name: 'Foul Co.', isActive: true },
        members: [
          {
            id: 'member-a',
            lobbyId: LOBBY_ID,
            userId: ADMIN_USER_ID,
            role: 'admin',
            displayName: 'Ahmed',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'member-b',
            lobbyId: LOBBY_ID,
            userId: MEMBER_USER_ID,
            role: 'member',
            displayName: 'Sarah',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
  },
}));

const DRAFT = {
  lobbyId: LOBBY_ID,
  status: 'locked',
  members: [
    {
      id: 'member-a',
      userId: ADMIN_USER_ID,
      displayName: 'Ahmed',
      role: 'admin',
      paymentStatus: 'unpaid',
    },
    {
      id: 'member-b',
      userId: MEMBER_USER_ID,
      displayName: 'Sarah',
      role: 'member',
      paymentStatus: 'unpaid',
    },
  ],
  groups: [
    {
      menuItemId: FOUL,
      name: 'Foul',
      referencePrice: '10.00',
      lines: [
        {
          id: 'line-a',
          memberId: 'member-a',
          qty: 4,
          actualPrice: null,
          delivered: true,
          suggestedActual: '40.00',
        },
        {
          id: 'line-b',
          memberId: 'member-b',
          qty: 2,
          actualPrice: null,
          delivered: true,
          suggestedActual: '20.00',
        },
      ],
    },
    {
      menuItemId: TEA,
      name: 'Tea',
      referencePrice: '5.00',
      lines: [
        {
          id: 'line-c',
          memberId: 'member-a',
          qty: 1,
          actualPrice: null,
          delivered: true,
          suggestedActual: '5.00',
        },
      ],
    },
  ],
};

const mockGetDraft = jest.fn(() => Promise.resolve(DRAFT));
const mockPatchLines = jest.fn(() => Promise.resolve(DRAFT));

jest.mock('../../../api/endpoints/billing', () => ({
  billingApi: {
    getDraft: (...args: unknown[]) =>
      (mockGetDraft as (...a: unknown[]) => unknown)(...args),
    patchLines: (...args: unknown[]) =>
      (mockPatchLines as (...a: unknown[]) => unknown)(...args),
  },
}));

const Stack = createNativeStackNavigator<LobbyStackParamList>();

function BillReviewStub() {
  return <Text>Review stub</Text>;
}

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="BillEntry"
            component={BillEntryScreen}
            initialParams={{ lobbyCode: LOBBY_CODE }}
          />
          <Stack.Screen name="BillReview" component={BillReviewStub} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockUser.current = { id: ADMIN_USER_ID };
  lobbyStatus.current = 'locked';
  mockGetDraft.mockClear();
  mockPatchLines.mockClear();
});

describe('BillEntryScreen', () => {
  it('shows each item at its menu price before anything is typed', async () => {
    renderScreen();

    // 6 Foul at 10.00 and 1 Tea at 5.00.
    expect(await screen.findByText('Ref: 60.00 EGP')).toBeTruthy();
    expect(screen.getByText('Ref: 5.00 EGP')).toBeTruthy();
    expect(screen.getByText('Menu prices: 65.00 EGP')).toBeTruthy();
  });

  it('keeps a regular member out and never asks for the draft', async () => {
    mockUser.current = { id: MEMBER_USER_ID };

    renderScreen();

    expect(await screen.findByText('Host only')).toBeTruthy();
    expect(mockGetDraft).not.toHaveBeenCalled();
  });

  it('will not open the review while a delivered item has no price', async () => {
    renderScreen();
    await screen.findByTestId(`bill-price-${FOUL}`);

    fireEvent.changeText(screen.getByTestId(`bill-price-${FOUL}`), '66.00');
    fireEvent.press(screen.getByTestId('bill-entry-footer-action'));

    expect(await screen.findByText('Still needs a price: Tea')).toBeTruthy();
    expect(screen.queryByText('Review stub')).toBeNull();
  });

  it('splits an item priced for the group back across the people who ordered it', async () => {
    renderScreen();
    await screen.findByTestId(`bill-price-${FOUL}`);

    fireEvent.changeText(screen.getByTestId(`bill-price-${FOUL}`), '66.00');
    fireEvent.changeText(screen.getByTestId(`bill-price-${TEA}`), '6.00');
    fireEvent.press(screen.getByTestId('bill-entry-footer-action'));

    await waitFor(() => expect(screen.getByText('Review stub')).toBeTruthy());
    expect(mockPatchLines).toHaveBeenCalledWith(LOBBY_ID, {
      lines: [
        { id: 'line-a', actualPrice: '44.00', delivered: true },
        { id: 'line-b', actualPrice: '22.00', delivered: true },
        { id: 'line-c', actualPrice: '6.00', delivered: true },
      ],
    });
  });

  it('adds the charges to the running total as they are entered', async () => {
    renderScreen();
    await screen.findByTestId(`bill-price-${FOUL}`);

    fireEvent.changeText(screen.getByTestId(`bill-price-${FOUL}`), '60.00');
    fireEvent.changeText(screen.getByTestId(`bill-price-${TEA}`), '5.00');
    fireEvent.changeText(screen.getByTestId('bill-delivery-fee'), '15.00');
    fireEvent.changeText(screen.getByTestId('bill-discount'), '10.00');

    expect(screen.getByText('70.00')).toBeTruthy();
  });

  it('holds the form back until the order has been closed', async () => {
    lobbyStatus.current = 'open';

    renderScreen();

    expect(await screen.findByText('The order is still open')).toBeTruthy();
    expect(mockGetDraft).not.toHaveBeenCalled();
  });
});
