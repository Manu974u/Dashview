export const lightTheme = {
  background: '#F0F4F8',
  backgroundSecondary: '#E2EAF0',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  surfaceElevated: '#F8FAFC',
  accent: '#0066CC',
  accentGlow: 'rgba(0, 102, 204, 0.15)',
  voice: '#1E88E5',
  speed: '#F59E0B',
  speedActive: '#F59E0B',
  speedInactive: '#546E7A',
  recordingRed: '#E53935',
  success: '#2E7D32',
  textPrimary: '#0F1923',
  textSecondary: '#546E7A',
  border: 'rgba(0, 102, 204, 0.12)',
  navBackground: '#FFFFFF',
  navBorder: 'rgba(0,0,0,0.08)',
  cardBorder: 'rgba(0,0,0,0.06)',
  shadow: 'rgba(0,0,0,0.08)',
  overlay: 'rgba(0,0,0,0.5)',
  warning: '#F59E0B',
  error: '#E53935',
} as const;

export const darkTheme = {
  background: '#0F1923',
  backgroundSecondary: '#1A2535',
  surface: '#1E2D3D',
  surfaceSecondary: '#243447',
  surfaceElevated: '#243447',
  accent: '#00D4FF',
  accentGlow: 'rgba(0, 212, 255, 0.15)',
  voice: '#00D4FF',
  speed: '#FFB300',
  speedActive: '#FFB300',
  speedInactive: '#8899AA',
  recordingRed: '#FF1744',
  success: '#00E676',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A9BB0',
  border: 'rgba(0, 212, 255, 0.15)',
  navBackground: '#0F1923',
  navBorder: 'rgba(0,212,255,0.1)',
  cardBorder: 'rgba(255,255,255,0.06)',
  shadow: 'rgba(0,0,0,0.4)',
  overlay: 'rgba(0,0,0,0.7)',
  warning: '#FFB300',
  error: '#FF1744',
} as const;

export type Theme = typeof lightTheme;

// Backward-compat alias — files that still import `colors` statically get lightTheme
export const colors = lightTheme;

// Legacy type alias
export type Colors = Theme;
