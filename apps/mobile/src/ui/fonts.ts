import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';

/**
 * Loads the three Cairo weights referenced by `fontFamily` in the theme.
 * Returns true once text can render in the real family — or once loading has
 * failed, because a font download must never wedge the app on the splash
 * screen. React Native falls back to the system face for a missing family.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  return loaded || Boolean(error);
}
