import { useCallback, useEffect, useState } from 'react';
import { PostCard } from '../components/PostCard';
import { Header } from '../components/Header';
import type { Post } from '../types';
import { useAuth } from '../lib/auth';
import { fetchFeed } from '../lib/posts';

const MOCK_POSTS: Post[] = [
  {
    id: 'mock-1',
    author_id: 'a1',
    content:
      'Primeiro after do CRICRI e já tô sentindo a energia da cidade. Quem vai pro centro amanhã?',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    likes_count: 24,
    comments_count: 5,
    author: { id: 'a1', username: 'luna.sc', display_name: 'Luna', avatar_url: null, bio: null },
  },
  {
    id: 'mock-2',
    author_id: 'a2',
    content: 'Mapa de spots atualizado. A praça tá com presença alta agora 🔥',
    created_at: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
    likes_count: 41,
    comments_count: 12,
    author: {
      id: 'a2',
      username: 'cricri.oficial',
      display_name: 'CRICRI',
      avatar_url: null,
      bio: null,
    },
  },
  {
    id: 'mock-3',
    author_id: 'a3',
    content: 'Alguém viu o gatinho do festival? Tô cuidando dele no app e ele tá com fome 🐱',
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    likes_count: 67,
    comments_count: 18,
    author: { id: 'a3', username: 'meow', display_name: 'Meow', avatar_url: null, bio: null },
  },
];

export function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFeed(user?.id);
      if (data.length > 0) {
        setPosts(data);
        setUsingMock(false);
      } else {
        setPosts(MOCK_POSTS);
        setUsingMock(true);
      }
    } catch {
      setPosts(MOCK_POSTS);
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  function handleLikeChange(id: string, liked: boolean, likes: number) {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, liked_by_me: liked, likes_count: likes } : p))
    );
  }

  return (
    <div className="page page--feed">
      <Header title="CRICRI" />
      <div className="feed-tabs">
        <button type="button" className="feed-tab feed-tab--active">
          Para você
        </button>
        <button type="button" className="feed-tab">
          Seguindo
        </button>
      </div>

      {loading && <div className="feed-loading">Carregando…</div>}

      {!loading && usingMock && (
        <p className="page-hint" style={{ padding: '12px 16px', margin: 0 }}>
          Mostrando exemplos — publique o primeiro post ou confira o Supabase.
        </p>
      )}

      <div className="feed-list">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} onLikeChange={handleLikeChange} />
        ))}
      </div>
    </div>
  );
}
