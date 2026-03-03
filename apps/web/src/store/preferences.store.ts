import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';
export type Language = 'en' | 'es';

interface PreferencesState {
  themeMode: ThemeMode;
  language: Language;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  setLanguage: (lang: Language) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      themeMode: 'light',
      language: 'es',

      toggleTheme: () =>
        set((state) => ({ themeMode: state.themeMode === 'light' ? 'dark' : 'light' })),

      setTheme: (themeMode) => set({ themeMode }),

      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'catan-preferences',
    },
  ),
);
