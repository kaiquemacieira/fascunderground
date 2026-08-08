/** Perfil — schema real: name, handle, photo_url, bio (+ aliases) */
export interface Profile {
  id: string;
  username: string | null; // handle
  display_name: string | null; // name
  avatar_url: string | null; // photo_url
  bio: string | null;
  created_at?: string;
}

export interface Post {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  author?: Profile;
  liked_by_me?: boolean;
  images?: { url: string }[];
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: Profile;
}

export interface ProfileStats {
  posts: number;
  following: number;
  followers: number;
}

/** Normaliza row do Supabase (name/handle/photo_url ↔ display_name/username/avatar_url) */
export function normalizeProfile(row: Record<string, unknown> | null | undefined): Profile | null {
  if (!row || !row.id) return null;
  return {
    id: String(row.id),
    display_name: (row.display_name as string) || (row.name as string) || null,
    username: (row.username as string) || (row.handle as string) || null,
    avatar_url: (row.avatar_url as string) || (row.photo_url as string) || null,
    bio: (row.bio as string) || null,
    created_at: row.created_at as string | undefined,
  };
}
