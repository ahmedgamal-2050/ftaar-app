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
import { LoginScreen } from './LoginScreen';
import type { ProfileStackParamList } from '../../../navigation/types';
// Initialises the shared i18next instance so copy renders instead of raw keys.
import '../../../i18n';

const mockLogin = jest.fn();

jest.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

const Stack = createNativeStackNavigator<ProfileStackParamList>();

function ProfileScreenStub() {
  return null;
}

function renderScreen() {
  const ref = createNavigationContainerRef<ProfileStackParamList>();
  render(
    <NavigationContainer ref={ref}>
      <Stack.Navigator>
        <Stack.Screen name="ProfileScreen" component={ProfileScreenStub} />
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
  act(() => ref.navigate('Login'));
  return ref;
}

beforeEach(() => {
  mockLogin.mockReset();
});

describe('LoginScreen', () => {
  it('logs in with the entered credentials', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderScreen();

    const submit = screen.getByTestId('login-submit');
    expect(submit.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(
      screen.getByTestId('login-email'),
      'layla@example.com',
    );
    fireEvent.changeText(screen.getByTestId('login-password'), 'Str0ng!Pass');
    expect(submit.props.accessibilityState.disabled).toBe(false);

    fireEvent.press(submit);

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith(
        'layla@example.com',
        'Str0ng!Pass',
      ),
    );
  });

  it('shows an invalid-email hint once a malformed address is blurred', () => {
    renderScreen();

    fireEvent.changeText(screen.getByTestId('login-email'), 'not-an-email');
    fireEvent(screen.getByTestId('login-email'), 'blur');

    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
  });

  it('navigates back to Profile after a successful login, instead of spinning forever', async () => {
    mockLogin.mockResolvedValue(undefined);
    const ref = renderScreen();
    expect(ref.getCurrentRoute()?.name).toBe('Login');

    fireEvent.changeText(
      screen.getByTestId('login-email'),
      'layla@example.com',
    );
    fireEvent.changeText(screen.getByTestId('login-password'), 'Str0ng!Pass');
    fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() =>
      expect(ref.getCurrentRoute()?.name).toBe('ProfileScreen'),
    );
  });

  it('shows the credential error banner on INVALID_CREDENTIALS and stops the spinner', async () => {
    mockLogin.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        },
      },
    });
    renderScreen();

    fireEvent.changeText(
      screen.getByTestId('login-email'),
      'layla@example.com',
    );
    fireEvent.changeText(screen.getByTestId('login-password'), 'wrong');
    fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() => expect(screen.getByTestId('login-error')).toBeTruthy());
    expect(
      screen.getByTestId('login-submit').props.accessibilityState.disabled,
    ).toBe(false);
  });
});
