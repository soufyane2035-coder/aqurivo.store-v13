'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type ResolvedTheme = 'light' | 'dark';

interface ThemeToggleOrigin {
  x: number;
  y: number;
}

interface ThemeContextValue {
  theme: ResolvedTheme;
  toggleTheme: (origin?: ThemeToggleOrigin) => void;
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

function persistTheme(targetTheme: ResolvedTheme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, targetTheme);
    window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  } catch (error) {
    console.error('Unable to save the selected theme.', error);
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
    let savedTheme: string | null = null;
    let legacyTheme: string | null = null;

    try {
      savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      legacyTheme = window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    } catch (error) {
      console.error('Unable to read the saved theme.', error);
    }

    const storedTheme =
      savedTheme === 'light' || savedTheme === 'dark'
        ? savedTheme
        : legacyTheme === 'light' || legacyTheme === 'dark'
          ? legacyTheme
          : null;
    const targetTheme: ResolvedTheme =
      storedTheme ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    applyThemeToDom(targetTheme);
    setThemeState(targetTheme);
    if (legacyTheme) {
      persistTheme(targetTheme);
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== LEGACY_THEME_STORAGE_KEY) return;
      if (event.newValue !== 'light' && event.newValue !== 'dark') return;
      applyThemeToDom(event.newValue);
      setThemeState(event.newValue);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setTheme = useCallback((nextTheme: ResolvedTheme) => {
    setThemeState(nextTheme);
    applyThemeToDom(nextTheme);
    persistTheme(nextTheme);
  }, []);

  const toggleTheme = useCallback((origin?: ThemeToggleOrigin) => {
    const currentTheme: ResolvedTheme =
      document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const next: ResolvedTheme = currentTheme === 'light' ? 'dark' : 'light';
    const updateTheme = () => {
      setThemeState(next);
      applyThemeToDom(next);
      persistTheme(next);
    };

    const view = document as Document & {
      startViewTransition?: (update: () => void) => { ready: Promise<void>; finished: Promise<void> };
    };
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!origin || prefersReducedMotion || typeof view.startViewTransition !== 'function') {
      updateTheme();
      return;
    }

    const root = document.documentElement;
    const x = Math.round(origin.x);
    const y = Math.round(origin.y);
    const endX = Math.max(x, window.innerWidth - x);
    const endY = Math.max(y, window.innerHeight - y);
    const radius = Math.ceil(Math.hypot(endX, endY));

    root.style.setProperty('--aq-theme-x', `${x}px`);
    root.style.setProperty('--aq-theme-y', `${y}px`);
    root.style.setProperty('--aq-theme-radius', `${radius}px`);
    root.dataset.themeTransition = next;

    const clearTransitionOrigin = () => {
      delete root.dataset.themeTransition;
      root.style.removeProperty('--aq-theme-x');
      root.style.removeProperty('--aq-theme-y');
      root.style.removeProperty('--aq-theme-radius');
    };

    try {
      const transition = view.startViewTransition(() => {
        updateTheme();
      });
      void transition.finished.then(
        clearTransitionOrigin,
        (error: unknown) => {
          clearTransitionOrigin();
          console.error('Theme transition failed.', error);
        }
      );
    } catch (error) {
      clearTransitionOrigin();
      console.error('Theme transition could not start.', error);
      updateTheme();
    }
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
