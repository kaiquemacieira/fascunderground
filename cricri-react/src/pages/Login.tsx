import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Header } from '../components/Header';

export function Login() {
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate('/perfil', { replace: true });
  }, [user, navigate]);


  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res =
        mode === 'in'
          ? await signIn(email.trim(), password)
          : await signUp(email.trim(), password, name.trim() || undefined);
      if (res.error) setError(res.error);
      else navigate('/');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    const res = await signInWithGoogle();
    if (res.error) setError(res.error);
  }

  return (
    <div className="page page--login">
      <Header title="Entrar" showBack />
      <div className="page-body login">
        <div className="login__tabs">
          <button
            type="button"
            className={mode === 'in' ? 'login__tab login__tab--active' : 'login__tab'}
            onClick={() => setMode('in')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={mode === 'up' ? 'login__tab login__tab--active' : 'login__tab'}
            onClick={() => setMode('up')}
          >
            Criar conta
          </button>
        </div>

        <form className="login__form" onSubmit={handleSubmit}>
          {mode === 'up' && (
            <label className="field">
              <span>Nome</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como quer aparecer"
                autoComplete="name"
              />
            </label>
          )}
          <label className="field">
            <span>E-mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              autoComplete="email"
            />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mín. 6 caracteres"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <p className="login__error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Aguarde…' : mode === 'in' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <div className="login__divider">
          <span>ou</span>
        </div>

        <button type="button" className="btn-google" onClick={handleGoogle}>
          Continuar com Google
        </button>

        <p className="page-hint">
          Mesmo backend do app vanilla (Supabase). Confirme o e-mail na primeira vez se o painel
          estiver com “Confirm email” ligado.
        </p>
      </div>
    </div>
  );
}
