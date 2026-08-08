import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { onInstallAvailable, promptInstall } from '../lib/pwa';
import { playSfx } from '../lib/sfx';

export function InstallBanner() {
  const [can, setCan] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('cricri-install-dismissed') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => onInstallAvailable(setCan), []);

  if (!can || dismissed) return null;

  return (
    <div className="install-banner" role="region" aria-label="Instalar aplicativo">
      <div className="install-banner__text">
        <strong>Instalar CRICRI</strong>
        <span>Acesso rápido, tela cheia</span>
      </div>
      <div className="install-banner__actions">
        <button
          type="button"
          className="btn-ghost"
          style={{ padding: '8px 12px', fontSize: '0.85rem' }}
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem('cricri-install-dismissed', '1');
            } catch {
              /* ignore */
            }
          }}
        >
          Agora não
        </button>
        <button
          type="button"
          className="btn-primary"
          style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem' }}
          onClick={() => {
            playSfx('install');
            promptInstall();
          }}
        >
          Instalar
        </button>
        <Link to="/instalar" className="btn-ghost" style={{ padding: '8px 10px', fontSize: '0.8rem' }}>
          Ver página
        </Link>
      </div>
    </div>
  );
}
