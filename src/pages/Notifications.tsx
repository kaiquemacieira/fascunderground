import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../lib/auth';
import {
  clearNotifications,
  markAllRead,
  markRead,
  requestBrowserPermission,
  subscribeNotifs,
  syncRemoteNotifications,
  type AppNotification,
} from '../lib/notifications';
import { playSfx } from '../lib/sfx';

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function Notifications() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [perm, setPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    return subscribeNotifs((s) => {
      setItems(s.items);
      setUnread(s.unread);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setSyncing(true);
      try {
        await syncRemoteNotifications(user.id);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function enablePush() {
    const ok = await requestBrowserPermission();
    setPerm(typeof Notification !== 'undefined' ? Notification.permission : 'default');
    if (ok) playSfx('success');
  }

  if (authLoading) {
    return (
      <div className="page">
        <Header title="Avisos" />
        <div className="page-body">
          <p className="page-hint">Carregando…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <Header title="Avisos" />
        <div className="page-body">
          <div className="empty-state">
            <p>Entre para ver avisos</p>
            <span>Meows, seguidores e comentários aparecem aqui.</span>
            <Link to="/login" className="btn-primary" style={{ marginTop: 20, display: 'inline-block' }}>
              Entrar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Header
        title="Avisos"
        right={
          items.length > 0 ? (
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
              onClick={() => {
                markAllRead();
                playSfx('click');
              }}
            >
              Ler tudo
            </button>
          ) : null
        }
      />

      <div className="page-body" style={{ paddingTop: 12 }}>
        {perm !== 'granted' && typeof Notification !== 'undefined' && (
          <div className="notif-perm">
            <p>Ative avisos do navegador para não perder Meow e comentários.</p>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '8px 16px' }}
              onClick={enablePush}
            >
              Permitir
            </button>
          </div>
        )}

        {syncing && <p className="page-hint">Sincronizando…</p>}

        {items.length === 0 && !syncing && (
          <div className="empty-state">
            <p>Nenhum aviso por enquanto</p>
            <span>Quando alguém te mandar Meow, seguir ou comentar, aparece aqui.</span>
          </div>
        )}

        <ul className="notif-list">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className={n.read ? 'notif-item' : 'notif-item notif-item--unread'}
                onClick={() => {
                  markRead(n.id);
                  playSfx('click');
                  if (n.href) navigate(n.href);
                }}
              >
                <span className="notif-item__ico" aria-hidden>
                  {n.ico}
                </span>
                <span className="notif-item__body">
                  <strong>{n.title}</strong>
                  {n.body && <span className="notif-item__text">{n.body}</span>}
                  <span className="notif-item__time">{timeAgo(n.ts)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {items.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                clearNotifications();
                playSfx('click');
              }}
            >
              Limpar avisos
            </button>
          </div>
        )}

        {unread > 0 && (
          <p className="page-hint" style={{ textAlign: 'center' }}>
            {unread} não lido{unread > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
