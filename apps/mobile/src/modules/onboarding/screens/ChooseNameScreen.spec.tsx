import * as React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { ChooseNameScreen } from './ChooseNameScreen';
// Initialises the shared i18next instance so copy renders instead of raw keys.
import '../../../i18n';

const mockCompleteOnboarding = jest.fn();

jest.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ completeOnboarding: mockCompleteOnboarding }),
}));

beforeEach(() => {
  mockCompleteOnboarding.mockReset();
});

describe('ChooseNameScreen', () => {
  it('disables Continue until a name is entered, then bootstraps a guest session', async () => {
    mockCompleteOnboarding.mockResolvedValue(undefined);
    render(<ChooseNameScreen />);

    const continueButton = screen.getByTestId('choose-name-continue');
    expect(continueButton.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByTestId('choose-name-input'), '  Layla  ');
    expect(continueButton.props.accessibilityState.disabled).toBe(false);

    fireEvent.press(continueButton);

    await waitFor(() =>
      expect(mockCompleteOnboarding).toHaveBeenCalledWith('Layla'),
    );
  });

  it('shows a required-name error once the empty field is blurred', () => {
    render(<ChooseNameScreen />);

    fireEvent(screen.getByTestId('choose-name-input'), 'blur');

    expect(screen.getByText('Enter your name to continue.')).toBeTruthy();
  });

  it('shows an inline error when the guest bootstrap call fails', async () => {
    mockCompleteOnboarding.mockRejectedValue(new Error('offline'));
    render(<ChooseNameScreen />);

    fireEvent.changeText(screen.getByTestId('choose-name-input'), 'Layla');
    fireEvent.press(screen.getByTestId('choose-name-continue'));

    await waitFor(() =>
      expect(screen.getByText('Something went wrong.')).toBeTruthy(),
    );
  });
});
