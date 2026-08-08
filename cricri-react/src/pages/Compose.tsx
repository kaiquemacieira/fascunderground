import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export function Compose() {
  const { user, profile, loading } = useAuth();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const max = 500;

  if (!loading && !user) {
    return (
      <div className="page">
        <Header title="Publicar" showBack />
        <div className="page-body">
          <div className="empty-state">
            <p>Entre para publicar</p>
            <span>Você precisa de uma conta para postar no CRICRI.</span>
            <Link to="/login" className="btn-primary" style={{ marginTop: 20, display: 'inline-block' }}>
              Entrar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function publish() {
    if (!text.trim() || !user) return;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('posts').insert({
        author_id: user.id,
        content: text.trim(),
      });
      if (err) {
        setError(err.message);
        return;
      }
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao publicar');
    } finally {
      setBusy(false);
    }
  }

  const displayName =
    profile?.display_name || profile?.username || user?.email?.split('@')[0] || 'Você';

  return (
    <div className="page page--compose">
      <Header
        title="Nova publicação"
        showBack
        right={
          <button className="btn-publish" disabled={!text.trim() || busy} onClick={publish}>
            {busy ? '…' : 'Publicar'}
          </button>
        }
      />
      <div className="compose">
        <Avatar src={profile?.avatar_url} name={displayName} size="md" />
        <textarea
          className="compose__input"
          placeholder="O que está acontecendo em São Cristóvão?"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, max))}
          rows={6}
          autoFocus
        />
      </div>
      {error && (
        <p className="login__error" style={{ padding: '0 16px' }}>
          {error}
        </p>
      )}
      <div className="compose__footer">
        <span className="compose__count">
          {text.length}/{max}
        </span>
      </div>
    </div>
  );
}
