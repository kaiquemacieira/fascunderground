import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { canInstall, onInstallAvailable, promptInstall } from '../lib/pwa';
import { playSfx } from '../lib/sfx';

const FEATURES_LIST = [
  { title: 'Feed estilo Threads', desc: 'Posts, likes e comentários em tempo de festival' },
  { title: 'Meow', desc: 'Scraps íntimos, XP, badges e laço com o Cri' },
  { title: 'Cri Cabrunco', desc: 'Tamagotchi de São Cristóvão — cuide e evolua' },
  { title: 'Mapa de spots', desc: 'Centro histórico com status ao vivo' },
  { title: 'Modo app', desc: 'Tela cheia, ícone na home, funciona offline no shell' },
];

export function Install() {
  const [can, setCan] = useState(canInstall());
  const [done, setDone] = useState(false);
  const standalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true);

  useEffect(() => onInstallAvailable(setCan), []);

  async function install() {
    playSfx('install');
    const ok = await promptInstall();
    if (ok) setDone(true);
  }

  return (
    <div className="page page--install">
      <Header title="Instalar CRICRI" showBack />
      <div className="store-listing">
        <div className="store-listing__hero">
          <img src="/icons/icon-512.png" alt="" width={88} height={88} className="store-listing__icon" />
          <div>
            <h1 className="store-listing__name">CRICRI</h1>
            <p className="store-listing__dev">Festival de Artes · São Cristóvão</p>
            <p className="store-listing__meta">Social · Eventos · Grátis</p>
          </div>
        </div>

        <div className="store-listing__cta">
          {standalone || done ? (
            <p className="tama__msg">App instalado — abra pelo ícone na tela inicial.</p>
          ) : can ? (
            <button type="button" className="btn-primary store-listing__btn" onClick={install}>
              Instalar
            </button>
          ) : (
            <div className="store-listing__howto">
              <p className="page-hint" style={{ margin: 0 }}>
                <strong>No celular:</strong>
              </p>
              <ul>
                <li>
                  <strong>Android (Chrome):</strong> menu ⋮ → <em>Instalar app</em> ou{' '}
                  <em>Adicionar à tela inicial</em>
                </li>
                <li>
                  <strong>iPhone (Safari):</strong> Compartilhar → <em>Adicionar à Tela de Início</em>
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="store-listing__stars" aria-hidden>
          ★★★★★ <span>Experiência de app nativo via PWA</span>
        </div>

        <h2 className="store-listing__section">Sobre este app</h2>
        <p className="store-listing__about">
          CRICRI é a linha do tempo viva de São Cristóvão: mural social, mapa de spots, o pet Cri
          Cabrunco e o <strong>Meow</strong> — scraps que só a roda entende. Instalado, abre em tela
          cheia como um app da Play Store ou da App Store.
        </p>

        <h2 className="store-listing__section">Recursos</h2>
        <ul className="store-listing__features">
          {FEATURES_LIST.map((f) => (
            <li key={f.title}>
              <strong>{f.title}</strong>
              <span>{f.desc}</span>
            </li>
          ))}
        </ul>

        <h2 className="store-listing__section">Classificação</h2>
        <p className="page-hint">Livre · Conteúdo social de festival · Sem compras no app</p>
      </div>
    </div>
  );
}
