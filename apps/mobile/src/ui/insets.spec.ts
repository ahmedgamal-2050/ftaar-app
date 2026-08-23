import { Platform, StatusBar } from 'react-native';
import { notchInset } from './insets';

describe('notchInset', () => {
  it('uses the safe-area top when it is larger than the Android status bar', () => {
    expect(notchInset(47)).toBeGreaterThanOrEqual(47);
  });

  it('falls back to StatusBar.currentHeight on Android when insets are 0', () => {
    if (Platform.OS !== 'android') {
      return;
    }

    expect(notchInset(0)).toBe(StatusBar.currentHeight ?? 0);
  });
});
