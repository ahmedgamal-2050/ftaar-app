import * as React from 'react';
import { Alert, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { BillReviewScreen } from './BillReviewScreen';
import type { LobbyStackParamList } from '../../../navigation/types';
// Initialises the shared i18next instance so assertions read real copy.
import '../../../i18n';

const LOBBY_CODE = 'FTAAR1';
const LOBBY_ID = 'lobby-1';
const ADMIN_USER_ID = 'user-a';

const FEES = {
  deliveryFee: '15.00',
  serviceFee: '5.00',
  discount: '10.00',
  receiptTotal: null as string | null,
};

jest.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: ADMIN_USER_ID } }),
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
        ],
      }),
  },
}));

function invariant(receiptTotal: string | null = null) {
  return {
    subtotal: '65.00',
    deliveryFee: '15.00',
    serviceFee: '5.00',
    discount: '10.00',
    netFees: '10.00',
    tax: '5.00',
    total: '75.00',
    members: [
      {
        id: 'member-a',
        userId: ADMIN_USER_ID,
        displayName: 'Ahmed',
        role: 'admin' as const,
        itemsSubtotal: '65.00',
        feesShare: '10.00',
        total: '75.00',
        paymentStatus: 'unpaid' as const,
      },
    ],
    allocations: [],
    reconciliation: {
      receiptTotal,
      computedTotal: '75.00',
      difference: receiptTotal ? '-5.00' : null,
      warns: receiptTotal !== null,
    },
  };
}

const mockPreview = jest.fn(() => Promise.resolve(invariant()));
const mockGetBill = jest.fn(() =>
  Promise.resolve({ ...invariant(), status: 'billed' }),
);
const mockFinalise = jest.fn(() =>
  Promise.resolve({ ...invariant(), status: 'billed' }),
);
const mockReopen = jest.fn(() =>
  Promise.resolve({ lobbyId: LOBBY_ID, status: 'locked' }),
);

jest.mock('../../../api/endpoints/billing', () => ({
  billingApi: {
    preview: (...args: unknown[]) =>
      (mockPreview as (...a: unknown[]) => unknown)(...args),
    getBill: (...args: unknown[]) =>
      (mockGetBill as (...a: unknown[]) => unknown)(...args),
    finalise: (...args: unknown[]) =>
      (mockFinalise as (...a: unknown[]) => unknown)(...args),
    reopen: (...args: unknown[]) =>
      (mockReopen as (...a: unknown[]) => unknown)(...args),
  },
}));

const Stack = createNativeStackNavigator<LobbyStackParamList>();

function RouteStub({ label }: { label: string }) {
  return <Text>{label}</Text>;
}

function renderScreen(params: LobbyStackParamList['BillReview']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="BillReview"
            component={BillReviewScreen}
            initialParams={params}
          />
          <Stack.Screen name="PaymentBoard">
            {() => <RouteStub label="Payment board stub" />}
          </Stack.Screen>
          <Stack.Screen name="BillEntry">
            {() => <RouteStub label="Bill entry stub" />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

/** An error shaped the way the backend's envelope reaches `getApiError`. */
function apiError(code: string, message: string) {
  return Object.assign(new Error(message), {
    isAxiosError: true,
    response: {
      status: 409,
      data: { success: false, error: { code, message } },
    },
  });
}

beforeEach(() => {
  lobbyStatus.current = 'locked';
  jest.clearAllMocks();
});

describe('BillReviewScreen', () => {
  it('shows what each person owes before anyone pays', async () => {
    renderScreen({ lobbyCode: LOBBY_CODE, fees: FEES });

    expect(await screen.findByText('Ahmed (You)')).toBeTruthy();
    expect(screen.getByText('Items 65.00 + fees 10.00')).toBeTruthy();
    expect(screen.getByTestId('bill-grand-total')).toBeTruthy();
    expect(mockPreview).toHaveBeenCalledWith(LOBBY_ID, FEES);
  });

  it('publishes with the charges it was handed and moves on to collection', async () => {
    renderScreen({ lobbyCode: LOBBY_CODE, fees: FEES });
    await screen.findByTestId('bill-review-footer-action');

    fireEvent.press(screen.getByTestId('bill-review-footer-action'));

    await waitFor(() =>
      expect(screen.getByText('Payment board stub')).toBeTruthy(),
    );
    const [lobbyId, fees, idempotencyKey] = mockFinalise.mock.calls[0] as never;
    expect(lobbyId).toBe(LOBBY_ID);
    expect(fees).toEqual(FEES);
    expect(typeof idempotencyKey).toBe('string');
  });

  it('flags a receipt that disagrees with the items without blocking', async () => {
    mockPreview.mockResolvedValueOnce(invariant('80.00'));

    renderScreen({
      lobbyCode: LOBBY_CODE,
      fees: { ...FEES, receiptTotal: '80.00' },
    });

    expect(
      await screen.findByText(
        'The receipt says 80.00 EGP but these items add up to 75.00 EGP.',
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('bill-review-footer-action')).toBeTruthy();
  });

  it('offers a way back once the bill is published', async () => {
    lobbyStatus.current = 'billed';
    jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _body, buttons) =>
        buttons?.find((button) => button.style === 'destructive')?.onPress?.(),
      );

    renderScreen({ lobbyCode: LOBBY_CODE });
    await screen.findByText('Reopen to fix a mistake');

    fireEvent.press(screen.getByTestId('bill-review-footer-action'));

    await waitFor(() =>
      expect(screen.getByText('Bill entry stub')).toBeTruthy(),
    );
    expect(mockGetBill).toHaveBeenCalledWith(LOBBY_ID);
    expect(mockReopen).toHaveBeenCalledWith(LOBBY_ID);
  });

  it('explains why a bill someone has already paid into cannot be reopened', async () => {
    lobbyStatus.current = 'billed';
    mockReopen.mockRejectedValueOnce(
      apiError('BILL_LOCKED', 'Cannot reopen after a member has paid'),
    );
    jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _body, buttons) =>
        buttons?.find((button) => button.style === 'destructive')?.onPress?.(),
      );

    renderScreen({ lobbyCode: LOBBY_CODE });
    await screen.findByText('Reopen to fix a mistake');

    fireEvent.press(screen.getByTestId('bill-review-footer-action'));

    expect(
      await screen.findByText(
        "Someone has already paid — the bill can't be reopened.",
      ),
    ).toBeTruthy();
  });
});
