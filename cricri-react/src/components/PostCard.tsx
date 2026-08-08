import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from './Avatar';
import type { Post } from '../types';
import clsx from 'clsx';
import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { toggleLike } from '../lib/posts';
import { playSfx } from '../lib/sfx';

interface PostCardProps {

  post: Post;
  onLikeChange?: (id: string, liked: boolean, likes: number) => void;
  /** Esconde o botão de comentar se já estiver na página do post */
  hideCommentNav?: boolean;
}

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

export function PostCard({ post, onLikeChange, hideCommentNav }: PostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!post.liked_by_me);
  const [likes, setLikes] = useState(post.likes_count ?? 0);
  const [busy, setBusy] = useState(false);

  const author = post.author;
  const name = author?.display_name || author?.username || 'Anônimo';
  const handle = author?.username ? `@${author.username}` : '';

  async function handleLike() {
    if (!user) {
      navigate('/login');
      return;
    }
    if (busy) return;
    setBusy(true);
    const prevLiked = liked;
    const prevLikes = likes;
    // optimistic
    setLiked(!prevLiked);
    setLikes(prevLiked ? prevLikes - 1 : prevLikes + 1);
    try {
      const nowLiked = await toggleLike(post.id, user.id, prevLiked);
      setLiked(nowLiked);
      const next = nowLiked ? prevLikes + 1 : Math.max(0, prevLikes - 1);
      setLikes(next);
      if (nowLiked) playSfx('like');
      onLikeChange?.(post.id, nowLiked, next);

    } catch {
      setLiked(prevLiked);
      setLikes(prevLikes);
    } finally {
      setBusy(false);
    }
  }

  function openComments() {
    navigate(`/post/${post.id}`);
  }

  const profileHref = post.author_id ? `/perfil/${post.author_id}` : undefined;

  return (
    <article className="post-card">
      <div className="post-card__avatar">
        {profileHref ? (
          <Link to={profileHref} className="post-card__avatar-link" onClick={(e) => e.stopPropagation()}>
            <Avatar src={author?.avatar_url} name={name} size="md" />
          </Link>
        ) : (
          <Avatar src={author?.avatar_url} name={name} size="md" />
        )}
      </div>

      <div className="post-card__body">
        <header className="post-card__header">
          <div className="post-card__meta">
            {profileHref ? (
              <Link to={profileHref} className="post-card__name post-card__name--link" onClick={(e) => e.stopPropagation()}>
                {name}
              </Link>
            ) : (
              <span className="post-card__name">{name}</span>
            )}
            {handle && <span className="post-card__handle">{handle}</span>}
            <span className="post-card__dot">·</span>
            <time className="post-card__time" dateTime={post.created_at}>
              {timeAgo(post.created_at)}
            </time>
          </div>
          <button className="post-card__more" aria-label="Mais opções" type="button">
            <MoreHorizontal size={18} strokeWidth={1.8} />
          </button>
        </header>


        <div
          className="post-card__content"
          role={hideCommentNav ? undefined : 'button'}
          tabIndex={hideCommentNav ? undefined : 0}
          onClick={hideCommentNav ? undefined : openComments}
          onKeyDown={
            hideCommentNav
              ? undefined
              : (e) => {
                  if (e.key === 'Enter' || e.key === ' ') openComments();
                }
          }
        >
          {post.content}
        </div>

        {post.images && post.images.length > 0 && (
          <div className="post-card__media">
            {post.images.map((img, i) => (
              <img key={i} src={img.url} alt="" loading="lazy" />
            ))}
          </div>
        )}

        <footer className="post-card__actions">
          <button
            type="button"
            className={clsx('action', liked && 'action--liked')}
            onClick={handleLike}
            aria-label={liked ? 'Descurtir' : 'Curtir'}
            disabled={busy}
          >
            <Heart size={18} strokeWidth={1.8} fill={liked ? 'currentColor' : 'none'} />
            {likes > 0 && <span>{likes}</span>}
          </button>

          <button
            type="button"
            className="action"
            aria-label="Comentar"
            onClick={openComments}
          >
            <MessageCircle size={18} strokeWidth={1.8} />
            {(post.comments_count ?? 0) > 0 && <span>{post.comments_count}</span>}
          </button>

          <button type="button" className="action" aria-label="Repostar">
            <Repeat2 size={18} strokeWidth={1.8} />
          </button>

          <button type="button" className="action" aria-label="Compartilhar">
            <Share size={18} strokeWidth={1.8} />
          </button>
        </footer>
      </div>
    </article>
  );
}
