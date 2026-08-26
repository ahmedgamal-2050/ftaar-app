import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { RegisterScreen } from './RegisterScreen';

const mockRegister = jest.fn();

jest.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ register: mockRegister }),
}));

describe('RegisterScreen', () => {
  it('renders its name and converts the local session', () => {
    render(<RegisterScreen />);

    expect(screen.getByTestId('placeholder-Register')).toBeTruthy();
    fireEvent.press(screen.getByText('Continue'));
    expect(mockRegister).toHaveBeenCalled();
  });
});
