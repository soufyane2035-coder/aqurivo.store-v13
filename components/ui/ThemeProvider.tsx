'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: ResolvedTheme;
  toggleTheme: () => void;
  setTheme: (nextTheme: ResolvedTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = 'aqurivo_theme';
const LEGACY_THEME_STORAGE_KEY = 'soufshop_theme';

function applyThemeToDom(targetTheme: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(targetTheme);
  document.documentElement.setAttribute('data-theme', targetTheme);
  if (document.body) {
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(targetTheme);
  }
}

if (typeof window !== 'undefined') {
  const win = window as unknown as { __soufSafeJsonInstalled?: boolean };
  if (!win.__soufSafeJsonInstalled) {
    win.__soufSafeJsonInstalled = true;
    const originalStringify = JSON.stringify.bind(JSON);
    JSON.stringify = ((
      value: unknown,
      replacer?: ((this: unknown, key: string, value: unknown) => unknown) | (number | string)[] | null,
      space?: string | number
    ): string => {
      try {
        return originalStringify(value, replacer as never, space);
      } catch {
        const seen = new WeakSet<object>();
        return originalStringify(
          value,
          function (key: string, val: unknown) {
            if (
              key.startsWith('__reactFiber$') ||
              key.startsWith('__reactProps$') ||
              key.startsWith('__reactEvents$') ||
              key === '_owner' ||
              key === 'stateNode'
            ) {
              return undefined;
            }
            if (typeof val === 'object' && val !== null) {
              if (typeof Node !== 'undefined' && val instanceof Node) {
                return `[DOM:${val.nodeName}]`;
              }
              if (typeof Window !== 'undefined' && val instanceof Window) {
                return '[Window]';
              }
              if (seen.has(val)) {
                return undefined;
              }
              seen.add(val);
            }
            if (typeof replacer === 'function') {
              return replacer.call(this, key, val);
            }
            return val;
          },
          space
        );
      }
    }) as typeof JSON.stringify;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ResolvedTheme>('light');

  useEffect(() => {
    try {
      const saved =
        window.localStorage.getItem(THEME_STORAGE_KEY) ||
        window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
      const targetTheme: ResolvedTheme =
        saved === 'light' || saved === 'dark'
          ? saved
          : window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
      applyThemeToDom(targetTheme);
      // Migrate legacy key if found
      if (window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY)) {
        window.localStorage.setItem(THEME_STORAGE_KEY, targetTheme);
        window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
      }
      queueMicrotask(() => {
        setThemeState(targetTheme);
      });
    } catch {
      // Ignore storage errors
    }
  }, []);

  const setTheme = useCallback((nextTheme: ResolvedTheme) => {
    setThemeState(nextTheme);
    applyThemeToDom(nextTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ResolvedTheme = prev === 'light' ? 'dark' : 'light';
      applyThemeToDom(next);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
        window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'light',
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
}
