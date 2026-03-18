export const colors = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceElevated: '#252525',
  accent: '#E53935',
  voice: '#1E88E5',
  impact: '#FF6F00',
  speedActive: '#43A047',
  speedInactive: '#9E9E9E',
  textPrimary: '#FFFFFF',
  textSecondary: '#9E9E9E',
  border: '#2A2A2A',
  success: '#43A047',
  warning: '#FF6F00',
  error: '#E53935',
  overlay: 'rgba(0,0,0,0.7)',
} as const;

export type Colors = typeof colors;
