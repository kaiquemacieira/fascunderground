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

/** Posts de um autor, com contagens de like/comentário e liked_by_me */
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

  return data.map((p: Record<string, unknown>) => {
    const authorRaw = p.author as Record<string, unknown> | Record<string, unknown>[] | null;
    const authorRow = Array.isArray(authorRaw) ? authorRaw[0] : authorRaw;
    return {
      id: p.id as string,
      author_id: p.author_id as string,
      content: p.content as string,
      created_at: p.created_at as string,
      author: normalizeProfile(authorRow) ?? undefined,
      likes_count: likeCount.get(p.id as string) ?? 0,
      comments_count: commentCount.get(p.id as string) ?? 0,
      liked_by_me: myLiked.has(p.id as string),
    };
  });
}

/** true se fromId já segue toId */
export async function isFollowing(fromId: string, toId: string): Promise<boolean> {
  const { data } = await supabase
    .from('connections')
    .select('id')
    .eq('from_id', fromId)
    .eq('to_id', toId)
    .maybeSingle();
  return !!data;
}

/** Seguir usuário (insert em connections) */
export async function followUser(fromId: string, toId: string): Promise<void> {
  if (fromId === toId) throw new Error('Não é possível seguir a si mesmo');
  const { error } = await supabase.from('connections').insert({
    from_id: fromId,
    to_id: toId,
  });
  if (error) throw error;

}

/** Deixar de seguir */
export async function unfollowUser(fromId: string, toId: string): Promise<void> {
  const { error } = await supabase
    .from('connections')
    .delete()
    .eq('from_id', fromId)
    .eq('to_id', toId);
  if (error) throw error;
}

/** Busca pessoas por nome ou handle (mín. 2 caracteres) */
export async function searchProfiles(query: string, limit = 20): Promise<Profile[]> {
  const q = query.trim().replace(/[%_,]/g, '');
  if (q.length < 2) return [];

  const pattern = `%${q}%`;

  const [byName, byHandle] = await Promise.all([
    supabase.from('profiles').select(PROFILE_SELECT).ilike('name', pattern).limit(limit),
    supabase.from('profiles').select(PROFILE_SELECT).ilike('handle', pattern).limit(limit),
  ]);

  const map = new Map<string, Profile>();
  for (const row of [...(byName.data ?? []), ...(byHandle.data ?? [])]) {
    const p = normalizeProfile(row as Record<string, unknown>);
    if (p) map.set(p.id, p);
  }
  return Array.from(map.values()).slice(0, limit);
}


