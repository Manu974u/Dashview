export const colors = {
  // Backgrounds
  background: '#E8F5E2',      // pearlescent apple green
  surface: '#FFFFFF',         // pure white cards
  surfaceElevated: '#F0EFE8', // slightly warm tinted surface

  // Brand / interactive
  accent: '#1A2B4A',          // deep navy — primary interactive color
  recordingRed: '#E53935',    // warm red — recording state

  // Feature states
  voice: '#1E88E5',           // soft blue — voice detection active
  speed: '#F59E0B',           // amber — speed protection active

  // Text
  textPrimary: '#1A1A2E',     // near-black with blue tint
  textSecondary: '#6B7280',   // medium grey

  // Structural
  border: '#E8E7E2',          // warm light grey dividers
  shadow: 'rgba(0,0,0,0.08)', // subtle card shadow

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#E53935',

  overlay: 'rgba(0,0,0,0.5)',
} as const;

export type Colors = typeof colors;
