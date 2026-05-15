import {lightTheme, Theme} from '../theme/colors';

// Fixed green HUD palette — theme toggle removed in v1.1.
// All components get the same tactical-green theme regardless of system setting.
export function useTheme(): Theme {
  return lightTheme;
}
