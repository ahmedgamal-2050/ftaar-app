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
import { RegisterScreen } from './RegisterScreen';
import type { ProfileStackParamList } from '../../../navigation/types';
// Initialises the shared i18next instance so copy renders instead of raw keys.
import '../../../i18n';

const mockRegister = jest.fn();

jest.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { displayName: 'Layla', isGuest: true },
    register: mockRegister,
  }),
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
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
  act(() => ref.navigate('Register'));
  return ref;
}

beforeEach(() => {
  mockRegister.mockReset();
});

describe('RegisterScreen', () => {
  it('pre-fills the carried-over display name and converts the guest session', async () => {
    mockRegister.mockResolvedValue(undefined);
    renderScreen();

    expect(screen.getByTestId('register-display-name').props.value).toBe(
      'Layla',
    );

    const submit = screen.getByTestId('register-submit');
    expect(submit.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(
      screen.getByTestId('register-email'),
      'layla@example.com',
    );
    fireEvent.changeText(
      screen.getByTestId('register-password'),
      'Str0ng!Pass',
    );
    expect(submit.props.accessibilityState.disabled).toBe(false);

    fireEvent.press(submit);

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith(
        'layla@example.com',
        'Str0ng!Pass',
      ),
    );
  });

  it('shows format hints once the email and password fields are blurred invalid', () => {
    renderScreen();

    fireEvent.changeText(screen.getByTestId('register-email'), 'not-an-email');
    fireEvent(screen.getByTestId('register-email'), 'blur');
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('register-password'), 'short');
    fireEvent(screen.getByTestId('register-password'), 'blur');
    expect(
      screen.getByText('Password must be at least 8 characters.'),
    ).toBeTruthy();
  });

  it('navigates back to Profile after a successful conversion, instead of spinning forever', async () => {
    mockRegister.mockResolvedValue(undefined);
    const ref = renderScreen();
    expect(ref.getCurrentRoute()?.name).toBe('Register');

    fireEvent.changeText(
      screen.getByTestId('register-email'),
      'layla@example.com',
    );
    fireEvent.changeText(
      screen.getByTestId('register-password'),
      'Str0ng!Pass',
    );
    fireEvent.press(screen.getByTestId('register-submit'));

    await waitFor(() =>
      expect(ref.getCurrentRoute()?.name).toBe('ProfileScreen'),
    );
  });

  it('surfaces EMAIL_ALREADY_REGISTERED as a friendly inline error and stops the spinner', async () => {
    mockRegister.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          success: false,
          error: {
            code: 'EMAIL_ALREADY_REGISTERED',
            message: 'An account with this email already exists',
          },
        },
      },
    });
    renderScreen();

    fireEvent.changeText(
      screen.getByTestId('register-email'),
      'layla@example.com',
    );
    fireEvent.changeText(
      screen.getByTestId('register-password'),
      'Str0ng!Pass',
    );
    fireEvent.press(screen.getByTestId('register-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('register-error')).toBeTruthy(),
    );
    expect(
      screen.getByTestId('register-submit').props.accessibilityState.disabled,
    ).toBe(false);
  });
});
