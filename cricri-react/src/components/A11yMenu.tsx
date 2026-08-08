import { useState } from 'react';
import { Accessibility, Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { playSfx } from '../lib/sfx';

export function A11yMenu() {
  const { theme, toggleTheme, a11y, setA11y } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="a11y-menu">
      <button
        type="button"
        className="a11y-menu__fab"
        aria-expanded={open}
        aria-label="Tema e acessibilidade"
        onClick={() => {
          setOpen((v) => !v);
          playSfx('click');
        }}
      >
        <Accessibility size={20} />
      </button>

      {open && (
        <div className="a11y-menu__panel" role="dialog" aria-label="Preferências de acessibilidade">
          <div className="a11y-menu__row">
            <span>Tema</span>
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: '6px 12px', display: 'inline-flex', gap: 6, alignItems: 'center' }}
              onClick={() => {
                toggleTheme();
                playSfx('click');
              }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </button>
          </div>

          <label className="a11y-menu__check">
            <input
              type="checkbox"
              checked={a11y.contrast}
              onChange={(e) => setA11y({ contrast: e.target.checked })}
            />
            Alto contraste
          </label>
          <label className="a11y-menu__check">
            <input
              type="checkbox"
              checked={a11y.largeText}
              onChange={(e) => setA11y({ largeText: e.target.checked })}
            />
            Texto maior
          </label>
          <label className="a11y-menu__check">
            <input
              type="checkbox"
              checked={a11y.reduceMotion}
              onChange={(e) => setA11y({ reduceMotion: e.target.checked })}
            />
            Reduzir animações
          </label>
          <label className="a11y-menu__check">
            <input
              type="checkbox"
              checked={a11y.libras}
              onChange={(e) => {
                setA11y({ libras: e.target.checked });
                playSfx('click');
              }}
            />
            Libras (VLibras)
          </label>
          <p className="a11y-menu__hint">
            Libras ativa o tradutor oficial VLibras do governo federal.
          </p>
          <button type="button" className="btn-ghost" style={{ width: '100%' }} onClick={() => setOpen(false)}>
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}
