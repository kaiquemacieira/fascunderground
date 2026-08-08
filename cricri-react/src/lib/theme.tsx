import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeMode = 'dark' | 'light';
export type A11yFlags = {
  contrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  /** Apenas lembra preferência; widget VLibras vem no index.html */
  libras: boolean;
};

const THEME_KEY = 'cricri-theme-v1';
const A11Y_KEY = 'cricri-a11y-v1';

type ThemeCtx = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  a11y: A11yFlags;
  setA11y: (patch: Partial<A11yFlags>) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

const defaultA11y: A11yFlags = {
  contrast: false,
  largeText: false,
  reduceMotion: false,
  libras: true,
};

function loadTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* */
  }
  return 'dark';
}

function loadA11y(): A11yFlags {
  try {
    const raw = localStorage.getItem(A11Y_KEY);
    if (!raw) return { ...defaultA11y };
    return { ...defaultA11y, ...JSON.parse(raw) };
  } catch {
    return { ...defaultA11y };
  }
}

function applyDom(theme: ThemeMode, a11y: A11yFlags) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('a11y-contrast', a11y.contrast);
  root.classList.toggle('a11y-large', a11y.largeText);
  root.classList.toggle('a11y-reduce-motion', a11y.reduceMotion);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0c0a08' : '#F7F6F3');

  // mostra/esconde botão VLibras
  document.documentElement.classList.toggle('hide-vlibras', a11y.libras === false);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    typeof document !== 'undefined' ? loadTheme() : 'dark'
  );
  const [a11y, setA11yState] = useState<A11yFlags>(() =>
    typeof document !== 'undefined' ? loadA11y() : defaultA11y
  );

  useEffect(() => {
    applyDom(theme, a11y);
    try {
      localStorage.setItem(THEME_KEY, theme);
      localStorage.setItem(A11Y_KEY, JSON.stringify(a11y));
    } catch {
      /* */
    }
  }, [theme, a11y]);

  const setTheme = useCallback((t: ThemeMode) => setThemeState(t), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
    []
  );
  const setA11y = useCallback((patch: Partial<A11yFlags>) => {
    setA11yState((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, a11y, setA11y }),
    [theme, setTheme, toggleTheme, a11y, setA11y]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme outside ThemeProvider');
  return ctx;
}
