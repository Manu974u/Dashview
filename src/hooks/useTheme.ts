import {useEffect, useState} from 'react';
import {useAppStore} from '../store/useAppStore';
import {lightTheme, darkTheme, Theme} from '../theme/colors';

function getAutoTheme(): Theme {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 20 ? lightTheme : darkTheme;
}

export function useTheme(): Theme {
  const themeMode = useAppStore(s => s.themeMode);
  const [autoTheme, setAutoTheme] = useState<Theme>(getAutoTheme());

  useEffect(() => {
    if (themeMode !== 'auto') return;
    const interval = setInterval(() => {
      setAutoTheme(getAutoTheme());
    }, 60_000);
    return () => clearInterval(interval);
  }, [themeMode]);

  if (themeMode === 'light') return lightTheme;
  if (themeMode === 'dark') return darkTheme;
  return autoTheme;
}
