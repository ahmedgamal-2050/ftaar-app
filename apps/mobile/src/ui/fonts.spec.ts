import { renderHook } from '@testing-library/react-native';

const mockUseFonts = jest.fn();

jest.mock('@expo-google-fonts/cairo', () => ({
  useFonts: (...args: unknown[]) => mockUseFonts(...args),
  Cairo_400Regular: 'Cairo_400Regular',
  Cairo_600SemiBold: 'Cairo_600SemiBold',
  Cairo_700Bold: 'Cairo_700Bold',
}));

// Imported after the mock so the hook picks it up.
import { useAppFonts } from './fonts';

describe('useAppFonts', () => {
  it('reports ready once the Cairo weights are loaded', () => {
    mockUseFonts.mockReturnValue([true, null]);

    expect(renderHook(() => useAppFonts()).result.current).toBe(true);
  });

  it('is not ready while the fonts are still loading', () => {
    mockUseFonts.mockReturnValue([false, null]);

    expect(renderHook(() => useAppFonts()).result.current).toBe(false);
  });

  it('reports ready on failure so a font download cannot wedge the splash', () => {
    mockUseFonts.mockReturnValue([false, new Error('offline')]);

    expect(renderHook(() => useAppFonts()).result.current).toBe(true);
  });

  it('requests the three weights the type scale references', () => {
    mockUseFonts.mockReturnValue([true, null]);
    renderHook(() => useAppFonts());

    expect(mockUseFonts).toHaveBeenCalledWith({
      Cairo_400Regular: 'Cairo_400Regular',
      Cairo_600SemiBold: 'Cairo_600SemiBold',
      Cairo_700Bold: 'Cairo_700Bold',
    });
  });
});
