'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export type Theme   = 'light' | 'dark' | 'system';
export type FontSize = 'sm' | 'md' | 'lg';
export type Density  = 'default' | 'compact';

interface DisplaySettings {
  theme:    Theme;
  fontSize: FontSize;
  density:  Density;
}

interface DisplayContextValue extends DisplaySettings {
  setTheme:    (t: Theme)    => void;
  setFontSize: (s: FontSize) => void;
  setDensity:  (d: Density)  => void;
}

// ── Storage key ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'fl-display';

function read(): DisplaySettings {
  try {
    return { theme: 'system', fontSize: 'md', density: 'default', ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
  } catch {
    return { theme: 'system', fontSize: 'md', density: 'default' };
  }
}

function save(s: DisplaySettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ── Helpers — apply settings to <html> ────────────────────────────────────────

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
}

function applyFontSize(fontSize: FontSize) {
  const sizes = { sm: '14px', md: '16px', lg: '18px' } as const;
  document.documentElement.style.fontSize = sizes[fontSize];
}

function applyDensity(density: Density) {
  document.documentElement.classList.toggle('compact', density === 'compact');
}

// ── Context ───────────────────────────────────────────────────────────────────

const DisplayContext = createContext<DisplayContextValue>({
  theme: 'system', fontSize: 'md', density: 'default',
  setTheme: () => {}, setFontSize: () => {}, setDensity: () => {},
});

export function useDisplay() { return useContext(DisplayContext); }

// ── Provider ──────────────────────────────────────────────────────────────────

export function DisplayProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<DisplaySettings>({
    theme: 'system', fontSize: 'md', density: 'default',
  });

  // Load from localStorage + apply on mount
  useEffect(() => {
    const stored = read();
    setSettings(stored);
    applyTheme(stored.theme);
    applyFontSize(stored.fontSize);
    applyDensity(stored.density);
  }, []);

  // Re-apply theme when system preference changes (only relevant for 'system')
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (settings.theme === 'system') applyTheme('system'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.theme]);

  const setTheme = useCallback((theme: Theme) => {
    const next = { ...settings, theme };
    setSettings(next);
    save(next);
    applyTheme(theme);
  }, [settings]);

  const setFontSize = useCallback((fontSize: FontSize) => {
    const next = { ...settings, fontSize };
    setSettings(next);
    save(next);
    applyFontSize(fontSize);
  }, [settings]);

  const setDensity = useCallback((density: Density) => {
    const next = { ...settings, density };
    setSettings(next);
    save(next);
    applyDensity(density);
  }, [settings]);

  return (
    <DisplayContext.Provider value={{ ...settings, setTheme, setFontSize, setDensity }}>
      {children}
    </DisplayContext.Provider>
  );
}

// ── Flash-prevention script content ──────────────────────────────────────────
// Injected as an inline <script> in <head> so it runs before React hydrates.

export const DISPLAY_FLASH_SCRIPT = `
(function(){
  try {
    var s = JSON.parse(localStorage.getItem('fl-display') || '{}');
    var t = s.theme || 'system';
    if (t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
    if (s.fontSize === 'sm') document.documentElement.style.fontSize = '14px';
    if (s.fontSize === 'lg') document.documentElement.style.fontSize = '18px';
    if (s.density === 'compact') document.documentElement.classList.add('compact');
  } catch(e) {}
})();
`;
