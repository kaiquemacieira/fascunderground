import { supabase } from './supabase';
import type { Post, Profile, ProfileStats } from '../types';
import { normalizeProfile } from '../types';

const PROFILE_SELECT = 'id, name, handle, photo_url, bio, created_at';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return normalizeProfile(data as Record<string, unknown>);
}

export async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  const [postsRes, followingRes, followersRes] = await Promise.all([
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', userId),
    supabase
      .from('connections')
      .select('id', { count: 'exact', head: true })
      .eq('from_id', userId),
    supabase
      .from('connections')
      .select('id', { count: 'exact', head: true })
      .eq('to_id', userId),
  ]);

  return {
    posts: postsRes.count ?? 0,
    following: followingRes.count ?? 0,
    followers: followersRes.count ?? 0,
  };
}

export async function fetchUserPosts(
  authorId: string,
  viewerId?: string | null,
  limit = 30
): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(
      `id, author_id, content, created_at,
       author:profiles!author_id(${PROFILE_SELECT})`
    )
    .eq('author_id', authorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];

  const ids = data.map((p: { id: string }) => p.id);

  const [likesRes, commentsRes, myLikesRes] = await Promise.all([
    supabase.from('post_likes').select('post_id').in('post_id', ids),
    supabase.from('post_comments').select('post_id').in('post_id', ids),
    viewerId
      ? supabase.from('post_likes').select('post_id').eq('user_id', viewerId).in('post_id', ids)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
  ]);

  const likeCount = new Map<string, number>();
  const commentCount = new Map<string, number>();
  const myLiked = new Set<string>();

  for (const row of likesRes.data ?? []) {
    likeCount.set(row.post_id, (likeCount.get(row.post_id) ?? 0) + 1);
  }
  for (const row of commentsRes.data ?? []) {
    commentCount.set(row.post_id, (commentCount.get(row.post_id) ?? 0) + 1);
  }
  for (const row of myLikesRes.data ?? []) {
    myLiked.add(row.post_id);
  }

  return data.map((row: Record<string, unknown>) => {
    const authorRaw = row.author as Record<string, unknown> | null;
    return {
      id: row.id as string,
      author_id: row.author_id as string,
      content: (row.content as string) || '',
      created_at: row.created_at as string,
      author: authorRaw ? normalizeProfile(authorRaw) : null,
      likes_count: likeCount.get(row.id as string) ?? 0,
      comments_count: commentCount.get(row.id as string) ?? 0,
      liked_by_me: myLiked.has(row.id as string),
    } as Post;
  });
}

export async function isFollowing(fromId: string, toId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('connections')
    .select('id')
    .eq('from_id', fromId)
    .eq('to_id', toId)
    .maybeSingle();
  if (error) {
    console.warn('[follow] isFollowing', error.message);
    return false;
  }
  return !!data;
}

/** Seguir — tenta com status (schema novo) e sem (legado) */
export async function followUser(fromId: string, toId: string): Promise<void> {
  if (fromId === toId) throw new Error('Não é possível seguir a si mesmo');

  // Já segue?
  const exists = await isFollowing(fromId, toId);
  if (exists) return;

  // Schema com status (amizade/pedido)
  const withStatus = await supabase.from('connections').insert({
    from_id: fromId,
    to_id: toId,
    status: 'accepted',
  });

  if (!withStatus.error) return;

  const msg = withStatus.error.message || '';
  // Coluna status inexistente → legado
  if (/status|column/i.test(msg)) {
    const leg = await supabase.from('connections').insert({
      from_id: fromId,
      to_id: toId,
    });
    if (leg.error) {
      if (/duplicate|unique|already/i.test(leg.error.message || '')) return;
      throw new Error(leg.error.message);
    }
    return;
  }

  if (/duplicate|unique|already/i.test(msg)) return;

  // RLS / auth
  if (/row-level security|RLS|permission|jwt|not authenticated/i.test(msg)) {
    throw new Error('Faça login de novo para seguir pessoas.');
  }

  throw new Error(msg || 'Não foi possível seguir');
}

export async function unfollowUser(fromId: string, toId: string): Promise<void> {
  const { error } = await supabase
    .from('connections')
    .delete()
    .eq('from_id', fromId)
    .eq('to_id', toId);
  if (error) throw new Error(error.message);
}

export async function searchProfiles(query: string, limit = 20): Promise<Profile[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .or(`name.ilike.%${q}%,handle.ilike.%${q}%`)
    .limit(limit);

  if (error || !data) return [];
  return data.map((row) => normalizeProfile(row as Record<string, unknown>));
}
