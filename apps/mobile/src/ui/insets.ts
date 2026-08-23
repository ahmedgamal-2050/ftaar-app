import { Platform, StatusBar } from 'react-native';

/**
 * Status-bar / notch height. `useSafeAreaInsets().top` is 0 on some Android
 * edge-to-edge builds, so we fall back to `StatusBar.currentHeight`.
 */
export function notchInset(insetsTop: number): number {
  const androidStatusBar = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  return Math.max(insetsTop, androidStatusBar);
}
