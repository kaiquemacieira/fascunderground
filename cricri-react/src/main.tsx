import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/app.css';
import App from './App.tsx';
import { initInstallPrompt, registerSW, repairPwa } from './lib/pwa';
import { bindSfxUnlock } from './lib/sfx';

initInstallPrompt();
registerSW();
bindSfxUnlock();

class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CRICRI] crash', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#0c0a08',
            color: '#FAF4EA',
            padding: 24,
            fontFamily: 'system-ui,sans-serif',
          }}
        >
          <h1 style={{ fontSize: 20 }}>CRICRI encontrou um erro</h1>
          <p style={{ opacity: 0.7, fontSize: 14 }}>{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => repairPwa()}
            style={{
              marginTop: 16,
              padding: '12px 20px',
              borderRadius: 999,
              border: 'none',
              background: '#C1523E',
              color: '#fff',
              fontWeight: 700,
            }}
          >
            Reparar app (limpar cache)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>
  );
}
