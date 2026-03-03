import { usePreferencesStore } from '../store/preferences.store';
import { translations } from '../i18n/translations';

export function useTranslation() {
  const language = usePreferencesStore((s) => s.language);
  const t = translations[language];
  return { t, language };
}
