import * as React from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { ResetPasswordScreen } from './ResetPasswordScreen';
// Initialises the shared i18next instance so copy renders instead of raw keys.
import '../../../i18n';

// The factory runs at require-time, before this file's own top-level `const`s
// are initialised — the mock object must be created inside the factory, not
// referenced from an outer `const`, or it evaluates to undefined.
jest.mock('../../../api/endpoints/auth', () => ({
  authApi: { resetPassword: jest.fn() },
}));

const { authApi: mockAuthApi } = jest.requireMock(
  '../../../api/endpoints/auth',
) as { authApi: { resetPassword: jest.Mock } };

type Routes = {
  ResetPassword: { resetToken: string };
  ForgotPassword: undefined;
  Login: undefined;
};
const Stack = createNativeStackNavigator<Routes>();

function renderScreen() {
  const ref = createNavigationContainerRef<Routes>();
  render(
    <NavigationContainer ref={ref}>
      <Stack.Navigator>
        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          initialParams={{ resetToken: 'reset-token-123' }}
        />
        <Stack.Screen name="ForgotPassword" component={() => null} />
        <Stack.Screen name="Login" component={() => null} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
  return ref;
}

beforeEach(() => {
  mockAuthApi.resetPassword.mockReset();
});

describe('ResetPasswordScreen', () => {
  it('shows an inline mismatch error and keeps Reset disabled while passwords differ', () => {
    renderScreen();

    fireEvent.changeText(
      screen.getByTestId('reset-password-new'),
      'Str0ng!Pass',
    );
    fireEvent.changeText(
      screen.getByTestId('reset-password-confirm'),
      'Different1',
    );

    expect(screen.getByText("Passwords don't match.")).toBeTruthy();
    expect(
      screen.getByTestId('reset-password-submit').props.accessibilityState
        .disabled,
    ).toBe(true);
  });

  it('shows a too-short hint once a short new password is blurred', () => {
    renderScreen();

    fireEvent.changeText(screen.getByTestId('reset-password-new'), 'short');
    fireEvent(screen.getByTestId('reset-password-new'), 'blur');

    expect(
      screen.getByText('Password must be at least 8 characters.'),
    ).toBeTruthy();
  });

  it('resets the password and lands on Login, replacing the whole stack', async () => {
    mockAuthApi.resetPassword.mockResolvedValue({ message: 'ok' });
    const ref = renderScreen();

    fireEvent.changeText(
      screen.getByTestId('reset-password-new'),
      'Str0ng!Pass',
    );
    fireEvent.changeText(
      screen.getByTestId('reset-password-confirm'),
      'Str0ng!Pass',
    );
    fireEvent.press(screen.getByTestId('reset-password-submit'));

    await waitFor(() => expect(ref.getCurrentRoute()?.name).toBe('Login'));
    expect(mockAuthApi.resetPassword).toHaveBeenCalledWith(
      'reset-token-123',
      'Str0ng!Pass',
    );
    expect(ref.getRootState()?.routes).toHaveLength(1);
  });

  it('offers Start over on an expired/invalid reset token, instead of retrying', async () => {
    mockAuthApi.resetPassword.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          success: false,
          error: { code: 'INVALID_RESET_TOKEN', message: 'expired' },
        },
      },
    });
    const ref = renderScreen();

    fireEvent.changeText(
      screen.getByTestId('reset-password-new'),
      'Str0ng!Pass',
    );
    fireEvent.changeText(
      screen.getByTestId('reset-password-confirm'),
      'Str0ng!Pass',
    );
    fireEvent.press(screen.getByTestId('reset-password-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('reset-password-start-over')).toBeTruthy(),
    );
    expect(screen.queryByTestId('reset-password-submit')).toBeNull();

    fireEvent.press(screen.getByTestId('reset-password-start-over'));
    await waitFor(() =>
      expect(ref.getCurrentRoute()?.name).toBe('ForgotPassword'),
    );
  });
});
