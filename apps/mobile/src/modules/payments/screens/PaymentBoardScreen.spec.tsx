import * as React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LobbyStackParamList } from '../../../navigation/types';
import type { PaymentBoard } from '../../../api/endpoints/payments';
import { PaymentBoardScreen } from './PaymentBoardScreen';
// Initialises the shared i18next instance so assertions read real copy.
import '../../../i18n';

const LOBBY_CODE = 'FTAAR1';
const LOBBY_ID = '22222222-2222-4222-8222-222222222222';
const HOST_USER_ID = '11111111-1111-4111-8111-111111111111';
const HOST_MEMBER_ID = '44444444-4444-4444-8444-444444444444';
const LINA_USER_ID = '66666666-6666-4666-8666-666666666666';
const LINA_MEMBER_ID = '77777777-7777-4777-8777-777777777777';

jest.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: HOST_USER_ID, displayName: 'Omar' } }),
}));

jest.mock('../../../api/endpoints/lobbies', () => ({
  lobbiesApi: {
    getByCode: jest.fn(() =>
      Promise.resolve({
        id: LOBBY_ID,
        code: LOBBY_CODE,
        status: 'billed',
        members: [],
      }),
    ),
    getById: jest.fn(),
  },
}));

const mockGetBoard = jest.fn();
const mockClaim = jest.fn();
const mockConfirm = jest.fn();
const mockReject = jest.fn();
const mockSettle = jest.fn();

jest.mock('../../../api/endpoints/payments', () => ({
  paymentsApi: {
    getBoard: (...a: unknown[]) => mockGetBoard(...a),
    claim: (...a: unknown[]) => mockClaim(...a),
    confirm: (...a: unknown[]) => mockConfirm(...a),
    reject: (...a: unknown[]) => mockReject(...a),
    settle: (...a: unknown[]) => mockSettle(...a),
  },
}));

jest.mock('../../../api/endpoints/bill', () => ({
  billApi: {
    get: jest.fn(() =>
      Promise.resolve({
        subtotal: '100.00',
        deliveryFee: '20.00',
        serviceFee: '0.00',
        discount: '0.00',
        netFees: '20.00',
        total: '120.00',
        members: [
          {
            id: LINA_MEMBER_ID,
            userId: LINA_USER_ID,
            displayName: 'Lina',
            role: 'member',
            itemsSubtotal: '50.00',
            feesShare: '10.00',
            total: '60.00',
            paymentStatus: 'unpaid',
          },
        ],
        reconciliation: {
          receiptTotal: null,
          computedTotal: '120.00',
          difference: null,
          warns: false,
        },
        status: 'billed',
      }),
    ),
  },
}));

function board(overrides: Partial<PaymentBoard> = {}): PaymentBoard {
  return {
    lobbyId: LOBBY_ID,
    status: 'billed',
    instaPayHandle: 'omar.pay',
    collected: '0.00',
    grandTotal: '120.00',
    you: {
      memberId: LINA_MEMBER_ID,
      amountOwed: '60.00',
      paymentStatus: 'unpaid',
      isAdmin: false,
    },
    members: [
      {
        id: HOST_MEMBER_ID,
        userId: HOST_USER_ID,
        displayName: 'Omar',
        role: 'admin',
        total: '60.00',
        paymentStatus: 'paid',
        pendingClaimId: null,
      },
      {
        id: LINA_MEMBER_ID,
        userId: LINA_USER_ID,
        displayName: 'Lina',
        role: 'member',
        total: '60.00',
        paymentStatus: 'unpaid',
        pendingClaimId: null,
      },
    ],
    waitingOn: ['Lina'],
    ...overrides,
  };
}

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const navigation = { replace: jest.fn() };
  const props = {
    navigation,
    route: { params: { lobbyCode: LOBBY_CODE } },
  } as unknown as NativeStackScreenProps<LobbyStackParamList, 'PaymentBoard'>;

  render(
    <QueryClientProvider client={queryClient}>
      <PaymentBoardScreen {...props} />
    </QueryClientProvider>,
  );
  return navigation;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetBoard.mockResolvedValue(board());
});

describe('PaymentBoardScreen', () => {
  /** The product's collection mechanism is mutual visibility, not reminders. */
  it("shows every member's status to a plain member, not just their own", async () => {
    renderScreen();

    expect(
      await screen.findByTestId(`payment-status-${HOST_MEMBER_ID}`),
    ).toBeTruthy();
    expect(screen.getByTestId(`payment-status-${LINA_MEMBER_ID}`)).toBeTruthy();
    expect(screen.getByText('Paid')).toBeTruthy();
    expect(screen.getByText('Not paid')).toBeTruthy();
  });

  it('breaks your share into what you ordered and your slice of the fees', async () => {
    renderScreen();

    expect(await screen.findByText('What you ordered')).toBeTruthy();
    expect(screen.getByText('EGP 50.00')).toBeTruthy();
    expect(screen.getByText('Your share of fees')).toBeTruthy();
    expect(screen.getByText('EGP 10.00')).toBeTruthy();
  });

  /**
   * Criterion: nothing delivered means no pay button and no unpaid badge —
   * a zero balance must never be dressed up as an outstanding debt.
   */
  it('offers no pay button and no unpaid status when you owe nothing', async () => {
    mockGetBoard.mockResolvedValue(
      board({
        you: {
          memberId: LINA_MEMBER_ID,
          amountOwed: '0.00',
          paymentStatus: 'paid',
          isAdmin: false,
        },
      }),
    );

    renderScreen();

    // Wait for the loaded board — the loading state shares the screen testID.
    await screen.findByText('Your share');

    expect(screen.queryByTestId('payment-pay-button')).toBeNull();
    expect(screen.queryByTestId('payment-claim-button')).toBeNull();
    expect(
      screen.getByText(
        'Nothing was delivered for you — you do not owe anything.',
      ),
    ).toBeTruthy();
  });

  /** Claiming carries no member id — you can only ever mark yourself. */
  it('claims for yourself only, passing no member identifier', async () => {
    mockClaim.mockResolvedValue(board());
    renderScreen();

    fireEvent.press(await screen.findByTestId('payment-claim-button'));

    await waitFor(() => expect(mockClaim).toHaveBeenCalled());
    const [lobbyId, payload] = mockClaim.mock.calls[0] as [string, unknown];
    expect(lobbyId).toBe(LOBBY_ID);
    expect(payload).toEqual({});
    expect(JSON.stringify(mockClaim.mock.calls[0])).not.toContain(
      HOST_MEMBER_ID,
    );
  });

  it('hides host confirm/reject controls from a plain member', async () => {
    mockGetBoard.mockResolvedValue(
      board({
        members: board().members.map((m) =>
          m.id === LINA_MEMBER_ID
            ? { ...m, paymentStatus: 'pending', pendingClaimId: 'claim-1' }
            : m,
        ),
      }),
    );

    renderScreen();

    // Wait for the roster; the pending claim below only renders once loaded.
    await screen.findByTestId(`payment-status-${LINA_MEMBER_ID}`);

    expect(
      screen.queryByTestId(`payment-confirm-${LINA_MEMBER_ID}`),
    ).toBeNull();
    expect(screen.queryByTestId(`payment-reject-${LINA_MEMBER_ID}`)).toBeNull();
    expect(screen.queryByTestId('payment-settle-button')).toBeNull();
  });

  it('gives the host confirm/reject on a pending claim', async () => {
    mockGetBoard.mockResolvedValue(
      board({
        you: {
          memberId: HOST_MEMBER_ID,
          amountOwed: '0.00',
          paymentStatus: 'paid',
          isAdmin: true,
        },
        members: board().members.map((m) =>
          m.id === LINA_MEMBER_ID
            ? { ...m, paymentStatus: 'pending', pendingClaimId: 'claim-1' }
            : m,
        ),
      }),
    );
    mockConfirm.mockResolvedValue(board());

    renderScreen();

    fireEvent.press(
      await screen.findByTestId(`payment-confirm-${LINA_MEMBER_ID}`),
    );

    await waitFor(() =>
      expect(mockConfirm).toHaveBeenCalledWith(LOBBY_ID, LINA_MEMBER_ID, {}),
    );
  });

  /** Criterion: a blocked close-out names the holdouts rather than counting them. */
  it('names the people holding up settlement when settle is refused', async () => {
    mockGetBoard.mockResolvedValue(
      board({
        you: {
          memberId: HOST_MEMBER_ID,
          amountOwed: '0.00',
          paymentStatus: 'paid',
          isAdmin: true,
        },
        waitingOn: [],
      }),
    );
    mockSettle.mockRejectedValue(
      Object.assign(new Error('Waiting on unpaid members'), {
        isAxiosError: true,
        response: {
          data: {
            success: false,
            error: {
              code: 'SETTLEMENT_INCOMPLETE',
              message: 'Waiting on unpaid members',
              details: { waitingOn: ['Lina', 'Youssef'] },
            },
          },
        },
      }),
    );

    renderScreen();

    fireEvent.press(await screen.findByTestId('payment-settle-button'));

    // Wait for the notice itself: "Lina" alone also matches the roster row.
    await screen.findByTestId('payment-waiting-on');
    expect(screen.getByText('Waiting on Lina, Youssef')).toBeTruthy();
  });

  it('sends everyone to the read-only receipt once the lobby is settled', async () => {
    mockGetBoard.mockResolvedValue(board({ status: 'settled' }));

    const navigation = renderScreen();

    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith('LobbySettled', {
        lobbyCode: LOBBY_CODE,
      }),
    );
  });
});
