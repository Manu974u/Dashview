// Green retro-futuristic HUD palette — DashViewCar v1.1+
// primary:      #b5cf8f  — light sage green background
// gradientDark: #b5cf8f  — background depth layer
// accent:       #8EDB1F  — lime green accent (main interactive)
// secondary:    #0B8F2A  — emerald green secondary actions
// interface:    #6FCF2D  — soft neon green UI elements
// border:       #78C91C  — green outlines / icons
// panel:        #03440E  — dark panel background
// shadow:       #022D09  — deep green shadows
// highlight:    #A6F12A  — brightest lime for glow/hover

// Both light and dark resolve to the same HUD palette —
// the app is always displayed in "dark / tactical" mode.
export const lightTheme = {
  background: '#b5cf8f',
  backgroundSecondary: '#03440E',
  surface: '#03440E',
  surfaceSecondary: '#012E08',
  surfaceElevated: '#0B8F2A',
  accent: '#8EDB1F',
  accentGlow: 'rgba(142, 219, 31, 0.18)',
  voice: '#6FCF2D',
  speed: '#A6F12A',
  speedActive: '#A6F12A',
  speedInactive: '#78C91C',
  recordingRed: '#FF1744',
  success: '#A6F12A',
  textPrimary: '#EFFFDA',
  textSecondary: '#78C91C',
  border: 'rgba(120, 201, 28, 0.25)',
  navBackground: '#012E08',
  navBorder: 'rgba(142, 219, 31, 0.15)',
  cardBorder: 'rgba(120, 201, 28, 0.18)',
  shadow: 'rgba(2, 45, 9, 0.7)',
  overlay: 'rgba(1, 46, 8, 0.75)',
  warning: '#A6F12A',
  error: '#FF1744',
  // Extended green HUD tokens
  gradientDark: '#b5cf8f',
  secondary: '#0B8F2A',
  panel: '#03440E',
  highlight: '#A6F12A',
} as const;

export const darkTheme = {
  background: '#b5cf8f',
  backgroundSecondary: '#03440E',
  surface: '#03440E',
  surfaceSecondary: '#012E08',
  surfaceElevated: '#0B8F2A',
  accent: '#8EDB1F',
  accentGlow: 'rgba(142, 219, 31, 0.18)',
  voice: '#6FCF2D',
  speed: '#A6F12A',
  speedActive: '#A6F12A',
  speedInactive: '#78C91C',
  recordingRed: '#FF1744',
  success: '#A6F12A',
  textPrimary: '#EFFFDA',
  textSecondary: '#78C91C',
  border: 'rgba(120, 201, 28, 0.25)',
  navBackground: '#012E08',
  navBorder: 'rgba(142, 219, 31, 0.15)',
  cardBorder: 'rgba(120, 201, 28, 0.18)',
  shadow: 'rgba(2, 45, 9, 0.7)',
  overlay: 'rgba(1, 46, 8, 0.75)',
  warning: '#A6F12A',
  error: '#FF1744',
  // Extended green HUD tokens
  gradientDark: '#b5cf8f',
  secondary: '#0B8F2A',
  panel: '#03440E',
  highlight: '#A6F12A',
} as const;

export type Theme = typeof lightTheme;

// Backward-compat alias — files that still import `colors` statically get lightTheme
export const colors = lightTheme;

// Legacy type alias
export type Colors = Theme;
