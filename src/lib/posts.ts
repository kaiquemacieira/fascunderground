import { supabase } from './supabase';
import type { Post, Comment, Profile } from '../types';
import { normalizeProfile } from '../types';

const AUTHOR_SELECT =
  'id, author_id, content, created_at, author:profiles!author_id(id, name, handle, photo_url, bio, created_at)';

function authorFromRow(a: unknown): Profile | undefined {
  if (!a) return undefined;
  const row = Array.isArray(a) ? a[0] : a;
  return normalizeProfile(row as Record<string, unknown>) ?? undefined;
}

/** Lista posts recentes + contagens e se o usuário atual curtiu */
export async function fetchFeed(userId?: string | null, limit = 30): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(AUTHOR_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];

  const posts = data as {
    id: string;
    author_id: string;
    content: string;
    created_at: string;
    author?: unknown;
  }[];
  const ids = posts.map((p) => p.id);

  const [likesRes, commentsRes, myLikesRes] = await Promise.all([
    supabase.from('post_likes').select('post_id').in('post_id', ids),
    supabase.from('post_comments').select('post_id').in('post_id', ids),
    userId
      ? supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', ids)
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

  return posts.map((p) => ({
    id: p.id,
    author_id: p.author_id,
    content: p.content,
    created_at: p.created_at,
    author: authorFromRow(p.author),
    likes_count: likeCount.get(p.id) ?? 0,
    comments_count: commentCount.get(p.id) ?? 0,
    liked_by_me: myLiked.has(p.id),
  }));
}

export async function fetchPost(id: string, userId?: string | null): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(AUTHOR_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    id: string;
    author_id: string;
    content: string;
    created_at: string;
    author?: unknown;
  };

  const [likesRes, commentsRes, myLike] = await Promise.all([
    supabase.from('post_likes').select('post_id', { count: 'exact', head: true }).eq('post_id', id),
    supabase
      .from('post_comments')
      .select('post_id', { count: 'exact', head: true })
      .eq('post_id', id),
    userId
      ? supabase
          .from('post_likes')
          .select('post_id')
          .eq('post_id', id)
          .eq('user_id', userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    id: row.id,
    author_id: row.author_id,
    content: row.content,
    created_at: row.created_at,
    author: authorFromRow(row.author),
    likes_count: likesRes.count ?? 0,
    comments_count: commentsRes.count ?? 0,
    liked_by_me: !!myLike.data,
  };
}

export async function toggleLike(postId: string, userId: string, currentlyLiked: boolean) {
  if (currentlyLiked) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
  if (error) throw error;
  return true;
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select(
      'id, post_id, author_id, content, created_at, author:profiles!author_id(id, name, handle, photo_url, bio)'
    )
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return data.map((c: Record<string, unknown>) => ({
    id: c.id as string,
    post_id: c.post_id as string,
    author_id: c.author_id as string,
    content: c.content as string,
    created_at: c.created_at as string,
    author: authorFromRow(c.author),
  }));
}

export async function addComment(postId: string, authorId: string, content: string) {
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, author_id: authorId, content: content.trim() })
    .select(
      'id, post_id, author_id, content, created_at, author:profiles!author_id(id, name, handle, photo_url, bio)'
    )
    .single();

  if (error) throw error;
  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    post_id: row.post_id as string,
    author_id: row.author_id as string,
    content: row.content as string,
    created_at: row.created_at as string,
    author: authorFromRow(row.author),
  } as Comment;
}
