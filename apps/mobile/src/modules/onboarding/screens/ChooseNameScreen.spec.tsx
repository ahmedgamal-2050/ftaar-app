import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ChooseNameScreen } from './ChooseNameScreen';

const mockCompleteOnboarding = jest.fn();

jest.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ completeOnboarding: mockCompleteOnboarding }),
}));

describe('ChooseNameScreen', () => {
  it('renders its name and completes onboarding locally', () => {
    render(<ChooseNameScreen />);

    expect(screen.getByTestId('placeholder-ChooseName')).toBeTruthy();
    fireEvent.press(screen.getByText('Continue'));
    expect(mockCompleteOnboarding).toHaveBeenCalledWith('Guest');
  });
});
