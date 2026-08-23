import * as React from 'react';
import { render, screen } from '@testing-library/react-native';
import { LtrText } from './LtrText';

describe('LtrText', () => {
  it('forces left-to-right rendering', () => {
    render(<LtrText>12.50 SAR</LtrText>);

    expect(screen.getByText('12.50 SAR')).toHaveStyle({
      writingDirection: 'ltr',
    });
  });

  it('keeps caller styles on top of the direction style', () => {
    render(<LtrText style={{ color: '#2B2320' }}>4F2K-9B</LtrText>);

    expect(screen.getByText('4F2K-9B')).toHaveStyle({
      writingDirection: 'ltr',
      color: '#2B2320',
    });
  });

  it('passes non-text children through unchanged', () => {
    render(
      <LtrText>
        <LtrText>nested</LtrText>
      </LtrText>,
    );

    expect(screen.getByText('nested')).toBeTruthy();
  });
});
