import type { TextStyle } from 'react-native';

/**
 * The single source of truth for every visual value in the app. Screens must
 * reference these tokens — a raw hex value, font size or margin number in a
 * screen file is a bug, not a shortcut.
 */
export const colors = {
  /** Warm amber/terracotta — buttons, active states, accents. */
  primary: '#D97742',
  /** Soft cream — screen backgrounds. */
  background: '#FDF8F3',
  /** Deep charcoal, deliberately not pure black. */
  text: '#2B2320',
  textMuted: '#8A7A70',
  /** "Paid" / confirmed states. */
  success: '#3E8E5A',
  /** Pale fill behind `success`, e.g. the paid pill on the payment board. */
  successSurface: '#EAF4EE',
  /** "Pending" / discrepancy highlights. */
  warning: '#D9A544',
  /** Pale fill behind `warning`, e.g. a payment claim awaiting the host. */
  warningSurface: '#FBF3E1',
  /** "Not paid" / errors. */
  danger: '#C24545',
  /** Pale fill behind `danger` text/icons, e.g. inline form-error banners. */
  dangerSurface: '#FBE9E9',
  border: '#E8DDD3',
  /** Cards sitting on top of the cream background. */
  surface: '#FFFFFF',
  /** Foreground for content placed on `primary` — filled buttons need it. */
  onPrimary: '#FFFFFF',
  /** Dimmed backdrop behind a modal. `text` at 45%, so the scrim reads as the
   * same warm charcoal as the rest of the palette rather than a flat grey. */
  scrim: 'rgba(43, 35, 32, 0.45)',
} as const;

export type ColorToken = keyof typeof colors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export type SpacingToken = keyof typeof spacing;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;

/**
 * Cairo is a rounded humanist sans with full Latin and Arabic coverage at
 * every weight, so one family carries both locales. Weight is selected by
 * family name — never pair these with `fontWeight`, which makes Android
 * synthesise a bolder face on top of an already-bold file.
 */
export const fontFamily = {
  regular: 'Cairo_400Regular',
  semibold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
} as const;

export type FontFamilyToken = keyof typeof fontFamily;

export type TypographyToken =
  | 'display'
  | 'title'
  | 'body'
  | 'caption'
  | 'label'
  | 'money';

/**
 * `label` covers button and tab text, and `money` adds tabular figures so
 * amounts stay column-aligned in bill and payment lists.
 */
export const typography: Record<TypographyToken, TextStyle> = {
  display: { fontFamily: fontFamily.bold, fontSize: 32, lineHeight: 40 },
  title: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 32 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 24 },
  money: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
};

export const theme = {
  colors,
  spacing,
  radius,
  fontFamily,
  typography,
} as const;
