import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../lib/auth';
import { FEATURES } from '../lib/features';
import {
  MEOW_BADGES,
  answerMeow,
  hideMeow,
  loadMeowProgress,
  loadMyMeowInbox,
  makeMeowPublic,
  meowLevelMeta,
  reactMeow,
  sendMeow,
  xpToNext,
  type MeowGameProgress,
  type MeowMessage,
} from '../lib/meow';
import { fetchProfile, searchProfiles } from '../lib/profile';
import { playSfx } from '../lib/sfx';
import type { Profile } from '../types';

export function Meow() {
  const { user, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const toId = params.get('to') || '';

  const [tab, setTab] = useState<'caixa' | 'enviar' | 'game'>(toId ? 'enviar' : 'caixa');
  const [inbox, setInbox] = useState<MeowMessage[]>([]);
  const [progress, setProgress] = useState<MeowGameProgress>(() => loadMeowProgress());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // enviar
  const [target, setTarget] = useState<Profile | null>(null);
  const [search, setSearch] = useState('');
  const [searchHits, setSearchHits] = useState<Profile[]>([]);
  const [body, setBody] = useState('');
  const [anon, setAnon] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);

  // responder
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await loadMyMeowInbox(user.id);
      setInbox(list);
      // XP de recebidos novos (simples: conta não respondidos como presença)
      setProgress(loadMeowProgress());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  useEffect(() => {
    if (!toId) return;
    fetchProfile(toId).then((p) => {
      if (p) {
        setTarget(p);
        setTab('enviar');
        playSfx('meowOpen');
      }
    });
  }, [toId]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setSearchHits([]);
      return;
    }
    const t = setTimeout(() => {
      searchProfiles(search.trim()).then(setSearchHits);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!user || !target) return;
    setSending(true);
    setError(null);
    setSentOk(false);
    try {
      await sendMeow(target.id, body, anon, user.id);
      setBody('');
      setSentOk(true);
      setProgress(loadMeowProgress());
    } catch (err) {
      playSfx('error');
      setError(err instanceof Error ? err.message : 'Falha ao enviar');
    } finally {
      setSending(false);
    }
  }

  async function handleAnswer(id: string) {
    if (!replyText.trim()) return;
    try {
      await answerMeow(id, replyText);
      setReplyId(null);
      setReplyText('');
      setProgress(loadMeowProgress());
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao responder');
    }
  }

  if (!FEATURES.meow) {
    return (
      <div className="page">
        <Header title="Meow" showBack />
        <div className="page-body">
          <p className="page-hint">Meow está desligado neste build.</p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="page">
        <Header title="Meow" showBack />
        <div className="page-body">
          <p className="page-hint">Carregando…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <Header title="Meow" showBack />
        <div className="page-body">
          <div className="empty-state">
            <p>🐾 Meow é a camada íntima</p>
            <span>Entre para abrir sua caixinha e mandar scraps na roda.</span>
            <Link to="/login" className="btn-primary" style={{ marginTop: 20, display: 'inline-block' }}>
              Entrar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const level = meowLevelMeta(progress.level);
  const xp = xpToNext(progress);

  return (
    <div className="page page--meow">
      <Header title="Meow" showBack />

      <div className="meow-hero">
        <div className="meow-hero__level">
          <span className="meow-hero__emoji">{level.emoji}</span>
          <div>
            <strong>
              Nv. {progress.level} · {level.title}
            </strong>
            <div className="meow-xp">
              <div className="meow-xp__fill" style={{ width: `${xp.pct}%` }} />
            </div>
            <span className="meow-hero__xp">
              {progress.xp} XP
              {xp.need > progress.xp ? ` · próximo em ${xp.need}` : ' · nível máximo'}
            </span>
          </div>
        </div>
        <div className="meow-hero__stats">
          <span>🔥 {progress.streak}d</span>
          <span>📤 {progress.sent}</span>
          <span>💬 {progress.answered}</span>
        </div>
      </div>

      <div className="explore-tabs">
        {(['caixa', 'enviar', 'game'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? 'explore-tab explore-tab--active' : 'explore-tab'}
            onClick={() => {
              setTab(t);
              playSfx('click');
            }}
          >
            {t === 'caixa' ? 'Caixinha' : t === 'enviar' ? 'Enviar' : 'Game'}
          </button>
        ))}
      </div>

      {error && (
        <p className="login__error" style={{ padding: '8px 16px' }}>
          {error}
        </p>
      )}

      {tab === 'caixa' && (
        <div className="page-body">
          {loading && <p className="page-hint">Carregando caixinha…</p>}
          {!loading && inbox.length === 0 && (
            <div className="empty-state">
              <p>Caixinha vazia</p>
              <span>Quando alguém te mandar um Meow, aparece aqui — anônimo ou assinado.</span>
            </div>
          )}
          <ul className="meow-list">
            {inbox.map((m) => (
              <li key={m.id} className="meow-card">
                <div className="meow-card__top">
                  <span className="meow-card__from">
                    {m.is_anonymous ? '🐾 Anônimo' : '✍️ Assinado'}
                  </span>
                  <time className="meow-card__time">
                    {new Date(m.created_at).toLocaleDateString('pt-BR')}
                  </time>
                </div>
                <p className="meow-card__body">{m.body}</p>
                {m.answer && (
                  <div className="meow-card__answer">
                    <strong>Sua resposta</strong>
                    <p>{m.answer}</p>
                  </div>
                )}
                <div className="meow-card__actions">
                  {['🔥', '💛', '🥹'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      className={m.reaction === em ? 'meow-react meow-react--on' : 'meow-react'}
                      onClick={() => reactMeow(m.id, em).then(refresh)}
                    >
                      {em}
                    </button>
                  ))}
                  {!m.answer && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => {
                        setReplyId(m.id);
                        playSfx('click');
                      }}
                    >
                      Responder
                    </button>
                  )}
                  {!m.is_public && m.answer && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => makeMeowPublic(m.id).then(refresh)}
                    >
                      Mural
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => hideMeow(m.id).then(refresh)}
                  >
                    Ocultar
                  </button>
                </div>
                {replyId === m.id && (
                  <div className="meow-reply">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                      rows={3}
                      placeholder="Sua resposta…"
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: 'auto', padding: '8px 16px' }}
                      onClick={() => handleAnswer(m.id)}
                    >
                      Enviar resposta
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'enviar' && (
        <div className="page-body">
          {!target ? (
            <>
              <div className="search-box">
                <input
                  type="search"
                  placeholder="Buscar quem vai receber o Meow…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <ul className="people-list">
                {searchHits.map((p) => {
                  const name = p.display_name || p.username || 'Usuário';
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="people-list__item"
                        style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                        onClick={() => {
                          setTarget(p);
                          playSfx('meowOpen');
                        }}
                      >
                        <span className="people-list__name">{name}</span>
                        {p.username && (
                          <span className="people-list__handle">@{p.username}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <form className="meow-send" onSubmit={handleSend}>
              <p className="page-hint" style={{ marginTop: 0 }}>
                Para{' '}
                <strong>{target.display_name || target.username || 'alguém'}</strong>
                {' · '}
                <button type="button" className="linkish" onClick={() => setTarget(null)}>
                  trocar
                </button>
              </p>
              <textarea
                className="compose__input"
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 12,
                  minHeight: 120,
                  width: '100%',
                }}
                placeholder="O que não teria coragem de assinar no poste…"
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 280))}
                maxLength={280}
              />
              <label className="meow-anon">
                <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
                Enviar como anônimo 🐾
              </label>
              <button type="submit" className="btn-primary" disabled={sending || !body.trim()}>
                {sending ? 'Enviando…' : 'Mandar Meow'}
              </button>
              {sentOk && <p className="tama__msg">Meow enviado. +12 XP</p>}
            </form>
          )}
        </div>
      )}

      {tab === 'game' && (
        <div className="page-body">
          <p className="tama-lead">
            Meow é o diferencial do CRICRI: cada scrap fortalece sua <strong>presença na roda</strong> e
            cuida do <Link to="/tamagotchi">Cri</Link> (+felicidade e care).
          </p>
          <div className="meow-game-grid">
            <div className="meow-stat-card">
              <strong>{progress.sent}</strong>
              <span>Enviados</span>
            </div>
            <div className="meow-stat-card">
              <strong>{progress.answered}</strong>
              <span>Respondidos</span>
            </div>
            <div className="meow-stat-card">
              <strong>{progress.streak}</strong>
              <span>Streak (dias)</span>
            </div>
            <div className="meow-stat-card">
              <strong>{progress.level}</strong>
              <span>Nível</span>
            </div>
          </div>
          <h3 className="profile__posts-title" style={{ marginTop: 20 }}>
            Badges
          </h3>
          <ul className="meow-badges">
            {Object.entries(MEOW_BADGES).map(([id, meta]) => {
              const on = progress.badges.includes(id);
              return (
                <li key={id} className={on ? 'meow-badge meow-badge--on' : 'meow-badge'}>
                  <span>{meta.emoji}</span>
                  <span>{meta.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
