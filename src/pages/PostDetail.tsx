import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { PostCard } from '../components/PostCard';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../lib/auth';
import { addComment, fetchComments, fetchPost } from '../lib/posts';
import type { Comment, Post } from '../types';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [p, c] = await Promise.all([fetchPost(id!, user?.id), fetchComments(id!)]);
        if (cancelled) return;
        setPost(p);
        setComments(c);
        if (!p) setError('Post não encontrado');
      } catch {
        if (!cancelled) setError('Erro ao carregar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !id || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const c = await addComment(id, user.id, text.trim());
      setComments((prev) => [...prev, c]);
      setPost((p) =>
        p ? { ...p, comments_count: (p.comments_count ?? 0) + 1 } : p
      );
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao comentar');
    } finally {
      setBusy(false);
    }
  }

  const displayName =
    profile?.display_name || profile?.username || user?.email?.split('@')[0] || 'Você';

  return (
    <div className="page page--post">
      <Header title="Thread" showBack />

      {loading && <div className="feed-loading">Carregando…</div>}

      {!loading && post && (
        <>
          <PostCard
            post={post}
            hideCommentNav
            onLikeChange={(_id, liked, likes) =>
              setPost((p) => (p ? { ...p, liked_by_me: liked, likes_count: likes } : p))
            }
          />

          <div className="comments">
            <h2 className="comments__title">
              Comentários {comments.length > 0 && `(${comments.length})`}
            </h2>

            {comments.length === 0 && (
              <p className="page-hint" style={{ margin: '0 0 16px' }}>
                Ainda não há comentários. Seja o primeiro.
              </p>
            )}

            <ul className="comments__list">
              {comments.map((c) => {
                const n =
                  c.author?.display_name || c.author?.username || 'Anônimo';
                return (
                  <li key={c.id} className="comment">
                    <Avatar src={c.author?.avatar_url} name={n} size="sm" />
                    <div className="comment__body">
                      <div className="comment__meta">
                        <span className="comment__name">{n}</span>
                        <span className="comment__time">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="comment__text">{c.content}</p>
                    </div>
                  </li>
                );
              })}
            </ul>

            {user ? (
              <form className="comment-form" onSubmit={handleSubmit}>
                <Avatar src={profile?.avatar_url} name={displayName} size="sm" />
                <input
                  type="text"
                  className="comment-form__input"
                  placeholder="Escreva um comentário…"
                  value={text}
                  maxLength={300}
                  onChange={(e) => setText(e.target.value)}
                  disabled={busy}
                />
                <button
                  type="submit"
                  className="btn-publish"
                  disabled={!text.trim() || busy}
                  style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                >
                  {busy ? '…' : 'Enviar'}
                </button>
              </form>
            ) : (
              <p className="page-hint">
                <Link to="/login">Entre</Link> para comentar.
              </p>
            )}

            {error && <p className="login__error">{error}</p>}
          </div>
        </>
      )}

      {!loading && !post && (
        <div className="page-body">
          <div className="empty-state">
            <p>{error || 'Post não encontrado'}</p>
            <Link to="/" className="btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>
              Voltar ao feed
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
