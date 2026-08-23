import * as React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeStackHeader } from './SafeStackHeader';
import { spacing } from '../theme';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';

const mockInsets = { top: 47, right: 0, bottom: 34, left: 0 };

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => mockInsets,
  };
});

function headerProps(overrides: Partial<NativeStackHeaderProps> = {}): NativeStackHeaderProps {
  return {
    navigation: { goBack: jest.fn() } as unknown as NativeStackHeaderProps['navigation'],
    route: { key: 'home', name: 'HomeScreen' },
    options: { title: 'Home' },
    ...overrides,
  };
}

describe('SafeStackHeader', () => {
  it('renders the title below the notch', () => {
    render(<SafeStackHeader {...headerProps()} />);

    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByTestId('safe-stack-header')).toHaveStyle({
      paddingTop: mockInsets.top + spacing.sm,
    });
  });

  it('shows a back control only when there is a previous screen', () => {
    const { rerender } = render(<SafeStackHeader {...headerProps()} />);
    expect(screen.queryByLabelText('Go back')).toBeNull();

    rerender(
      <SafeStackHeader
        {...headerProps({ back: { title: 'Home', href: undefined } })}
      />,
    );
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });
});
