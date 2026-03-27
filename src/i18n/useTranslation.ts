import {useAppStore} from '../store/useAppStore';
import {translations, Language} from './translations';

/**
 * Returns the translation function `t` for the current language.
 *
 * Usage:
 *   const {t} = useTranslation();
 *   t('home.title')          // → "Welcome to DashViewCar" (en) / "Bienvenue…" (fr)
 *   t('home.speedMonitoring', {speed: '60'})  // interpolates {speed}
 */
export function useTranslation() {
  const language: Language = useAppStore(s => (s as any).language ?? 'en');
  const dict = translations[language] ?? translations.en;

  function t(key: string, params?: Record<string, string | number>): string {
    const parts = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = dict;
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) {
        // Fallback to English
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let fb: any = translations.en;
        for (const p of parts) {
          fb = fb?.[p];
        }
        value = fb ?? key;
        break;
      }
    }
    let result = String(value ?? key);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return result;
  }

  return {t, language};
}
