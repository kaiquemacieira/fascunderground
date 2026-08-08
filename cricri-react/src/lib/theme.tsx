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
  /** Alto contraste */
  contrast: boolean;
  /** Texto maior */
  largeText: boolean;
  /** Menos animação */
  reduceMotion: boolean;
  /** Widget VLibras (Libras) */
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
  libras: false,
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
  root.classList.toggle('a11y-libras', a11y.libras);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0c0a08' : '#F7F6F3');
}

function ensureVLibras(on: boolean) {
  const existing = document.getElementById('vlibras-root');
  if (!on) {
    existing?.remove();
    document.getElementById('vlibras-script')?.remove();
    return;
  }
  if (existing) return;

  const wrap = document.createElement('div');
  wrap.id = 'vlibras-root';
  wrap.setAttribute('vw', '');
  wrap.className = 'enabled';
  wrap.innerHTML = `
    <div vw-access-button class="active"></div>
    <div vw-plugin-wrapper>
      <div class="vw-plugin-top-wrapper"></div>
    </div>
  `;
  document.body.appendChild(wrap);

  const script = document.createElement('script');
  script.id = 'vlibras-script';
  script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
  script.onload = () => {
    try {
      // @ts-expect-error VLibras global
      if (window.VLibras) new window.VLibras.Widget('https://vlibras.gov.br/app');
    } catch {
      /* */
    }
  };
  document.body.appendChild(script);
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
    ensureVLibras(a11y.libras);
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
