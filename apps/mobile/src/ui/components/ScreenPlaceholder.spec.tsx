import * as React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ScreenPlaceholder } from './ScreenPlaceholder';
import { colors } from '../theme';

describe('ScreenPlaceholder', () => {
  it('sits in the safe Screen container and shows its route name', () => {
    render(
      <ScreenPlaceholder name="Welcome">
        <Text>next</Text>
      </ScreenPlaceholder>,
    );

    expect(screen.getByTestId('placeholder-Welcome')).toBeTruthy();
    expect(screen.getByTestId('screen-Welcome')).toHaveStyle({
      backgroundColor: colors.background,
    });
    expect(screen.getByText('next')).toBeTruthy();
  });
});
