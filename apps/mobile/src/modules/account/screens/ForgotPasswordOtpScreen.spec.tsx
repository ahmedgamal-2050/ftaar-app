import * as React from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { ForgotPasswordOtpScreen } from './ForgotPasswordOtpScreen';
// Initialises the shared i18next instance so copy renders instead of raw keys.
import '../../../i18n';

// The factory runs at require-time, before this file's own top-level `const`s
// are initialised — the mock object must be created inside the factory, not
// referenced from an outer `const`, or it evaluates to undefined.
jest.mock('../../../api/endpoints/auth', () => ({
  authApi: { verifyForgotPasswordOtp: jest.fn(), forgotPassword: jest.fn() },
}));

const { authApi: mockAuthApi } = jest.requireMock(
  '../../../api/endpoints/auth',
) as {
  authApi: {
    verifyForgotPasswordOtp: jest.Mock;
    forgotPassword: jest.Mock;
  };
};

type Routes = {
  ForgotPasswordOtp: { email: string };
  ResetPassword: { resetToken: string };
};
const Stack = createNativeStackNavigator<Routes>();

function renderScreen() {
  const ref = createNavigationContainerRef<Routes>();
  render(
    <NavigationContainer ref={ref}>
      <Stack.Navigator>
        <Stack.Screen
          name="ForgotPasswordOtp"
          component={ForgotPasswordOtpScreen}
          initialParams={{ email: 'layla@example.com' }}
        />
        <Stack.Screen name="ResetPassword" component={() => null} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
  return ref;
}

beforeEach(() => {
  mockAuthApi.verifyForgotPasswordOtp.mockReset();
  mockAuthApi.forgotPassword.mockReset();
});

describe('ForgotPasswordOtpScreen', () => {
  it('verifies the code and moves to ResetPassword with the resetToken as a param', async () => {
    mockAuthApi.verifyForgotPasswordOtp.mockResolvedValue({
      resetToken: 'reset-token-123',
    });
    const ref = renderScreen();

    const verify = screen.getByTestId('forgot-password-otp-verify');
    expect(verify.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(
      screen.getByTestId('forgot-password-otp-input'),
      '123456',
    );
    expect(verify.props.accessibilityState.disabled).toBe(false);

    fireEvent.press(verify);

    await waitFor(() =>
      expect(ref.getCurrentRoute()?.name).toBe('ResetPassword'),
    );
    expect(mockAuthApi.verifyForgotPasswordOtp).toHaveBeenCalledWith(
      'layla@example.com',
      '123456',
    );
    expect(ref.getCurrentRoute()?.params).toEqual({
      resetToken: 'reset-token-123',
    });

    // `navigate` pushes ResetPassword on top rather than unmounting this
    // screen — it's still there underneath, and reappears exactly as it was
    // if the user goes back. The spinner must be reset or it's frozen
    // mid-spin when they do.
    act(() => ref.goBack());
    expect(
      screen.getByTestId('forgot-password-otp-verify').props.accessibilityState
        .disabled,
    ).toBe(false);
  });

  it('strips non-digits and caps input at 6 characters', () => {
    renderScreen();

    fireEvent.changeText(
      screen.getByTestId('forgot-password-otp-input'),
      '12-34-56-789',
    );

    expect(screen.getByTestId('forgot-password-otp-input').props.value).toBe(
      '123456',
    );
  });

  it.each([
    ['INVALID_OTP', "That code doesn't match. Try again."],
    ['OTP_EXPIRED', 'This code expired. Request a new one.'],
    ['OTP_TOO_MANY_ATTEMPTS', 'Too many attempts. Request a new code.'],
  ])('maps %s to a friendly inline error', async (code, expectedMessage) => {
    mockAuthApi.verifyForgotPasswordOtp.mockRejectedValue({
      isAxiosError: true,
      response: { data: { success: false, error: { code, message: 'raw' } } },
    });
    renderScreen();

    fireEvent.changeText(
      screen.getByTestId('forgot-password-otp-input'),
      '000000',
    );
    fireEvent.press(screen.getByTestId('forgot-password-otp-verify'));

    await waitFor(() => expect(screen.getByText(expectedMessage)).toBeTruthy());
  });

  it('disables Resend for the cooldown window, then re-sends and restarts it', async () => {
    jest.useFakeTimers();
    mockAuthApi.forgotPassword.mockResolvedValue({ message: 'ok' });
    renderScreen();

    const resend = screen.getByTestId('forgot-password-otp-resend');
    expect(resend.props.accessibilityState.disabled).toBe(true);

    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(
      screen.getByTestId('forgot-password-otp-resend').props.accessibilityState
        .disabled,
    ).toBe(false);

    fireEvent.press(screen.getByTestId('forgot-password-otp-resend'));
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockAuthApi.forgotPassword).toHaveBeenCalledWith(
      'layla@example.com',
    );
    expect(
      screen.getByTestId('forgot-password-otp-resend').props.accessibilityState
        .disabled,
    ).toBe(true);

    jest.useRealTimers();
  });
});
