'use client';

import React, { createContext, useContext, useEffect, useCallback, useSyncExternalStore } from 'react';

export type Theme = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'yt_chaptered_theme';

const themeListeners = new Set<() => void>();
let memoryTheme: Theme = 'system';

function notifyThemeListeners() {
  themeListeners.forEach((listener) => listener());
}

function subscribeTheme(callback: () => void): () => void {
  themeListeners.add(callback);
  return () => {
    themeListeners.delete(callback);
  };
}

function getStoredThemeSnapshot(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      memoryTheme = stored;
      return stored;
    }
  } catch {
    // Restricted environment fallback
  }
  return memoryTheme;
}

function getStoredThemeServerSnapshot(): Theme {
  return 'system';
}

function subscribeSystemScheme(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', callback);
  return () => {
    mediaQuery.removeEventListener('change', callback);
  };
}

function getSystemSnapshot(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getSystemServerSnapshot(): ResolvedTheme {
  return 'light';
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getStoredThemeSnapshot,
    getStoredThemeServerSnapshot
  );

  const systemTheme = useSyncExternalStore(
    subscribeSystemScheme,
    getSystemSnapshot,
    getSystemServerSnapshot
  );

  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [resolvedTheme]);

  // Sync state across different browser tabs/windows
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        notifyThemeListeners();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setTheme = useCallback((newTheme: 'light' | 'dark') => {
    memoryTheme = newTheme;
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // Storage unavailable fallback
    }
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    notifyThemeListeners();
  }, []);

  const toggleTheme = useCallback(() => {
    const current = getStoredThemeSnapshot();
    const currentResolved: ResolvedTheme =
      current === 'system' ? getSystemSnapshot() : current;
    const nextTheme: 'light' | 'dark' = currentResolved === 'dark' ? 'light' : 'dark';

    memoryTheme = nextTheme;
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Storage unavailable fallback
    }

    const root = document.documentElement;
    if (nextTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    notifyThemeListeners();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
