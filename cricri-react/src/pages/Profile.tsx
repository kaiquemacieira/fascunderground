import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FEATURES } from '../lib/features';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';
import { PostCard } from '../components/PostCard';
import { useAuth } from '../lib/auth';
import {
  fetchProfile,
  fetchProfileStats,
  fetchUserPosts,
  followUser,
  isFollowing,
  unfollowUser,
} from '../lib/profile';
import type { Post, Profile, ProfileStats } from '../types';

const emptyStats: ProfileStats = { posts: 0, following: 0, followers: 0 };

export function Profile() {
  const { id: paramId } = useParams<{ id?: string }>();
  const { user, profile: authProfile, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats>(emptyStats);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);

  const targetId = paramId || user?.id || null;
  const isOwn = !!(user && targetId && user.id === targetId);

  const load = useCallback(async () => {
    // /perfil sem login e sem :id → tela de entrar
    if (!targetId) {
      setLoading(false);
      setProfile(null);
      return;
    }

    setLoading(true);
    setNotFound(false);
    try {
      const [p, s, list] = await Promise.all([
        fetchProfile(targetId),
        fetchProfileStats(targetId),
        fetchUserPosts(targetId, user?.id),
      ]);

      if (!p && !isOwn) {
        setNotFound(true);
        setProfile(null);
        setStats(emptyStats);
        setPosts([]);
      } else {
        setProfile(p ?? (isOwn ? authProfile : null));
        setStats(s);
        setPosts(list);
      }

      if (user && !isOwn) {
        setFollowing(await isFollowing(user.id, targetId));
      } else {
        setFollowing(false);
      }
    } catch {
      if (isOwn) {
        setProfile(authProfile);
      } else {
        setNotFound(true);
        setProfile(null);
      }
      setStats(emptyStats);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [targetId, user?.id, isOwn, authProfile]);

  useEffect(() => {
    load();
  }, [load]);

  function handleLikeChange(id: string, liked: boolean, likes: number) {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, liked_by_me: liked, likes_count: likes } : p))
    );
  }

  async function handleFollow() {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!targetId || isOwn || followBusy) return;

    setFollowBusy(true);
    setFollowError(null);
    const prev = following;
    setFollowing(!prev);
    setStats((s) => ({
      ...s,
      followers: Math.max(0, s.followers + (prev ? -1 : 1)),
    }));

    try {
      if (prev) await unfollowUser(user.id, targetId);
      else await followUser(user.id, targetId);
    } catch (err) {
      setFollowing(prev);
      setStats((s) => ({
        ...s,
        followers: Math.max(0, s.followers + (prev ? 1 : -1)),
      }));
      setFollowError(err instanceof Error ? err.message : 'Não foi possível seguir');
    } finally {
      setFollowBusy(false);
    }
  }

  // /perfil sem estar logado
  if (!paramId && !authLoading && !user) {
    return (
      <div className="page">
        <Header title="Perfil" />
        <div className="page-body">
          <div className="empty-state">
            <p>Você ainda não entrou</p>
            <span>Entre para ver seu perfil e publicar.</span>
            <Link
              to="/login"
              className="btn-primary"
              style={{ marginTop: 20, display: 'inline-block' }}
            >
              Entrar ou criar conta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="page">
        <Header title="Perfil" showBack={!!paramId} />
        <div className="page-body">
          <p className="page-hint">Carregando…</p>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="page">
        <Header title="Perfil" showBack={!!paramId} />
        <div className="page-body">
          <div className="empty-state">
            <p>Perfil não encontrado</p>
            <Link to="/" className="btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>
              Voltar ao feed
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const name =
    profile.display_name || profile.username || (isOwn ? user?.email?.split('@')[0] : null) || 'Usuário';
  const handle = profile.username ? `@${profile.username}` : null;

  return (
    <div className="page">
      <Header title={isOwn ? 'Perfil' : name} showBack={!!paramId} />
      <div className="profile">
        <div className="page-body profile__top">
          <div className="profile__hero">
            <Avatar src={profile.avatar_url} name={name} size="lg" />
            <h2 className="profile__name">{name}</h2>
            {handle && <p className="profile__handle">{handle}</p>}
            {profile.bio && <p className="profile__bio">{profile.bio}</p>}
          </div>

          <div className="profile__stats">
            <div>
              <strong>{stats.posts}</strong>
              <span>Posts</span>
            </div>
            <div>
              <strong>{stats.followers}</strong>
              <span>Seguidores</span>
            </div>
            <div>
              <strong>{stats.following}</strong>
              <span>Seguindo</span>
            </div>
          </div>

          <div className="profile__actions">
            {isOwn ? (
              <>
                {FEATURES.meow && (
                  <Link
                    to="/meow"
                    className="btn-primary"
                    style={{ width: 'auto', padding: '10px 18px', textAlign: 'center' }}
                  >
                    🐾 Meow
                  </Link>
                )}
                <Link
                  to="/tamagotchi"
                  className="btn-ghost"
                  style={{ width: 'auto', padding: '10px 14px' }}
                >
                  Cri
                </Link>
                <Link
                  to="/notifs"
                  className="btn-ghost"
                  style={{ width: 'auto', padding: '10px 14px' }}
                >
                  Avisos
                </Link>
                <Link
                  to="/instalar"
                  className="btn-ghost"
                  style={{ width: 'auto', padding: '10px 14px' }}
                >
                  Instalar app
                </Link>
                <button type="button" className="btn-ghost" onClick={() => signOut()}>
                  Sair
                </button>

              </>
            ) : (
              <>
                <button
                  type="button"
                  className={following ? 'btn-ghost' : 'btn-primary'}
                  style={{ width: 'auto', minWidth: 110, padding: '10px 18px' }}
                  onClick={handleFollow}
                  disabled={followBusy}
                >
                  {followBusy ? '…' : following ? 'Seguindo' : 'Seguir'}
                </button>
                {FEATURES.meow && (
                  <Link
                    to={`/meow?to=${targetId}`}
                    className="btn-ghost"
                    style={{ width: 'auto', padding: '10px 14px' }}
                  >
                    🐾 Meow
                  </Link>
                )}
              </>
            )}
          </div>
          {followError && (
            <p className="login__error" style={{ textAlign: 'center', marginTop: 10 }}>
              {followError}
            </p>
          )}

        </div>

        <div className="profile__posts">
          <h3 className="profile__posts-title">Publicações</h3>
          {posts.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <p>{isOwn ? 'Nenhum post ainda' : 'Nenhuma publicação'}</p>
              {isOwn && (
                <>
                  <span>Publique algo no botão + da barra.</span>
                  <Link
                    to="/compose"
                    className="btn-primary"
                    style={{
                      marginTop: 16,
                      display: 'inline-block',
                      width: 'auto',
                      padding: '10px 20px',
                    }}
                  >
                    Nova publicação
                  </Link>
                </>
              )}
            </div>
          ) : (
            posts.map((p) => (
              <PostCard key={p.id} post={p} onLikeChange={handleLikeChange} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
