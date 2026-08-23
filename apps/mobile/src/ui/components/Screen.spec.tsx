import * as React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { SafeAppFrame, Screen } from './Screen';
import { colors } from '../theme';

const mockInsets = { top: 47, right: 0, bottom: 34, left: 0 };

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => mockInsets,
  };
});

describe('Screen', () => {
  it('paints the app background and renders its children', () => {
    render(
      <Screen testID="screen">
        <Text>content</Text>
      </Screen>,
    );

    expect(screen.getByText('content')).toBeTruthy();
    expect(screen.getByTestId('screen')).toHaveStyle({ backgroundColor: colors.background });
  });

  it('leaves the notch to the header and reserves the home indicator', () => {
    render(
      <Screen testID="screen">
        <Text>content</Text>
      </Screen>,
    );

    expect(screen.getByTestId('screen')).toHaveStyle({
      paddingTop: 0,
      paddingBottom: mockInsets.bottom,
    });
  });

  it('reserves the notch when a screen has no header', () => {
    render(
      <Screen testID="screen" edges={['top', 'left', 'right', 'bottom']}>
        <Text>content</Text>
      </Screen>,
    );

    expect(screen.getByTestId('screen')).toHaveStyle({ paddingTop: mockInsets.top });
  });
});

describe('SafeAppFrame', () => {
  it('paints the cream frame behind the navigator', () => {
    render(
      <SafeAppFrame>
        <Text>app</Text>
      </SafeAppFrame>,
    );

    expect(screen.getByTestId('safe-app-frame')).toHaveStyle({
      backgroundColor: colors.background,
    });
    expect(screen.getByText('app')).toBeTruthy();
  });
});
