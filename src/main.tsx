import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/app.css';
import App from './App.tsx';
import { initInstallPrompt, registerSW } from './lib/pwa';
import { bindSfxUnlock } from './lib/sfx';

initInstallPrompt();
registerSW();
bindSfxUnlock();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
