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
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
// Initialises the shared i18next instance so copy renders instead of raw keys.
import '../../../i18n';

// The factory runs at require-time, before this file's own top-level `const`s
// are initialised — the mock object must be created inside the factory, not
// referenced from an outer `const`, or it evaluates to undefined.
jest.mock('../../../api/endpoints/auth', () => ({
  authApi: { forgotPassword: jest.fn() },
}));

const { authApi: mockAuthApi } = jest.requireMock(
  '../../../api/endpoints/auth',
) as { authApi: { forgotPassword: jest.Mock } };

type Routes = {
  ForgotPassword: undefined;
  ForgotPasswordOtp: { email: string };
};
const Stack = createNativeStackNavigator<Routes>();

function renderScreen() {
  const ref = createNavigationContainerRef<Routes>();
  render(
    <NavigationContainer ref={ref}>
      <Stack.Navigator>
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ForgotPasswordOtp" component={() => null} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
  return ref;
}

beforeEach(() => {
  mockAuthApi.forgotPassword.mockReset();
});

describe('ForgotPasswordScreen', () => {
  it('sends the code and moves to OTP entry with the email as a param', async () => {
    mockAuthApi.forgotPassword.mockResolvedValue({ message: 'ok' });
    const ref = renderScreen();

    const submit = screen.getByTestId('forgot-password-submit');
    expect(submit.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(
      screen.getByTestId('forgot-password-email'),
      'layla@example.com',
    );
    expect(submit.props.accessibilityState.disabled).toBe(false);

    fireEvent.press(submit);

    await waitFor(() =>
      expect(ref.getCurrentRoute()?.name).toBe('ForgotPasswordOtp'),
    );
    expect(mockAuthApi.forgotPassword).toHaveBeenCalledWith(
      'layla@example.com',
    );
    expect(ref.getCurrentRoute()?.params).toEqual({
      email: 'layla@example.com',
    });

    // `navigate` pushes ForgotPasswordOtp on top rather than unmounting this
    // screen — it's still there underneath, and reappears exactly as it was
    // if the user goes back. The spinner must be reset or it's frozen
    // mid-spin when they do.
    act(() => ref.goBack());
    expect(
      screen.getByTestId('forgot-password-submit').props.accessibilityState
        .disabled,
    ).toBe(false);
  });

  it('shows an inline error and stops the spinner on a network failure', async () => {
    mockAuthApi.forgotPassword.mockRejectedValue(new Error('offline'));
    renderScreen();

    fireEvent.changeText(
      screen.getByTestId('forgot-password-email'),
      'layla@example.com',
    );
    fireEvent.press(screen.getByTestId('forgot-password-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('forgot-password-error')).toBeTruthy(),
    );
    expect(
      screen.getByTestId('forgot-password-submit').props.accessibilityState
        .disabled,
    ).toBe(false);
  });
});
