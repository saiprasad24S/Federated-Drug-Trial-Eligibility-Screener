import { create } from 'zustand';

const STORAGE_KEY = 'medfed-theme';

function getSystemPreference() {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getSavedTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* ignore */ }
  return null;
}

export const useThemeStore = create((set, get) => ({
  theme: getSavedTheme() || getSystemPreference(),

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: next });
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    applyThemeToDOM(next);
  },

  setTheme: (t) => {
    set({ theme: t });
    try { localStorage.setItem(STORAGE_KEY, t); } catch { /* ignore */ }
    applyThemeToDOM(t);
  },

  isDark: () => get().theme === 'dark',
}));

/** Apply / remove the `dark` class on <html> for Tailwind + CSS-variable switching */
export function applyThemeToDOM(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }
}

// Initialise on first load
applyThemeToDOM(getSavedTheme() || getSystemPreference());
