import * as React from 'react';
import { Image } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { MemberChip } from './MemberChip';
import { memberColor } from '../memberColor';

describe('MemberChip', () => {
  it('shows initials rather than a photo', () => {
    render(<MemberChip name="Mohamed Salah" testID="chip" />);

    expect(screen.getByText('MS')).toBeTruthy();
    expect(screen.UNSAFE_queryAllByType(Image)).toHaveLength(0);
  });

  it('colours the circle from the name', () => {
    render(<MemberChip name="Mohamed Salah" testID="chip" />);

    expect(screen.getByTestId('chip-circle')).toHaveStyle({
      backgroundColor: memberColor('Mohamed Salah'),
    });
  });

  it('exposes the full name to screen readers even without the label', () => {
    render(<MemberChip name="Layla" testID="chip" />);

    expect(screen.getByTestId('chip')).toHaveProp(
      'accessibilityLabel',
      'Layla',
    );
  });

  it('renders the name beside the circle when asked', () => {
    render(<MemberChip name="Layla" withName testID="chip" />);

    expect(screen.getByText('Layla')).toBeTruthy();
  });
});
