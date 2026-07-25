// Design tokens ported from the uploaded FaceAttend UI spec (DESIGN.md)

export const colors = {
  surface: '#f7f9fc',
  surfaceDim: '#d8dadd',
  surfaceBright: '#f7f9fc',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f4f7',
  surfaceContainer: '#eceef1',
  surfaceContainerHigh: '#e6e8eb',
  surfaceContainerHighest: '#e0e3e6',
  onSurface: '#191c1e',
  onSurfaceVariant: '#44474e',
  inverseSurface: '#2d3133',
  inverseOnSurface: '#eff1f4',
  outline: '#75777f',
  outlineVariant: '#c5c6cf',
  primary: '#031636',
  onPrimary: '#ffffff',
  primaryContainer: '#1a2b4c',
  onPrimaryContainer: '#8293ba',
  inversePrimary: '#b6c6f0',
  secondary: '#006684',
  onSecondary: '#ffffff',
  secondaryContainer: '#00c8fd', // Vibrant Cyan - primary action color
  onSecondaryContainer: '#005067',
  tertiary: '#001d05',
  onTertiary: '#ffffff',
  tertiaryContainer: '#00340f',
  onTertiaryContainer: '#00aa42', // Soft Emerald - success
  error: '#ba1a1a', // Muted Rose - failure
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  warning: '#b45309', // Amber - system warnings
  warningContainer: '#fef3c7',
  background: '#f7f9fc',
  onBackground: '#191c1e',
  surfaceVariant: '#e0e3e6',
};

export const typography = {
  headlineLg: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  headlineMd: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  subheader: { fontSize: 18, fontWeight: '500' as const, lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  subtext: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  labelCaps: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
};

export const radii = {
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 24,
  card: 32,
  full: 9999,
};

export const spacing = {
  base: 8,
  marginSide: 20,
  vertical: 16,
  gutter: 16,
  safeArea: 24,
};

export const shadow = {
  card: {
    shadowColor: '#1a2b4c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
};
