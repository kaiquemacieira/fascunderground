/**
 * Centro de avisos — compatível com vanilla (localStorage cricri-notifs-v1)
 * + sync leve com Supabase (Meow, conexões, comentários nos seus posts)
 */

import { supabase } from './supabase';
import { playSfx } from './sfx';

const STORAGE = 'cricri-notifs-v1';
const MAX = 40;
const SYNC_KEY = 'cricri-notifs-sync-v1';

export type NotifKind = 'cri' | 'scrap' | 'festa' | 'system' | 'social' | 'meow';

export interface AppNotification {
  id: string;
  ts: number;
  title: string;
  body: string;
  ico: string;
  kind: NotifKind;
  href: string | null;
  read?: boolean;
}

interface NotifState {
  items: AppNotification[];
  unread: number;
}

type Listener = (state: NotifState) => void;
const listeners = new Set<Listener>();

function load(): NotifState {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return { items: [], unread: 0 };
    const parsed = JSON.parse(raw) as NotifState;
    if (!parsed || !Array.isArray(parsed.items)) return { items: [], unread: 0 };
    return {
      items: parsed.items,
      unread: typeof parsed.unread === 'number' ? parsed.unread : parsed.items.filter((i) => !i.read).length,
    };
  } catch {
    return { items: [], unread: 0 };
  }
}

function save(state: NotifState) {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(state));
  } catch {
    /* */
  }
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch {
      /* */
    }
  });
  try {
    window.dispatchEvent(new CustomEvent('cricri:notifs', { detail: state }));
  } catch {
    /* */
  }
}

export function getNotifications(): NotifState {
  return load();
}

export function subscribeNotifs(fn: Listener) {
  listeners.add(fn);
  fn(load());
  return () => listeners.delete(fn);
}

export function pushNotification(input: {
  title: string;
  body?: string;
  ico?: string;
  kind?: NotifKind;
  href?: string | null;
  /** evita duplicar pelo id */
  id?: string;
}): AppNotification | null {
  if (!input?.title) return null;
  const state = load();
  const id =
    input.id ||
    `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  if (state.items.some((i) => i.id === id)) return null;

  const item: AppNotification = {
    id,
    ts: Date.now(),
    title: String(input.title).slice(0, 80),
    body: String(input.body || '').slice(0, 180),
    ico: input.ico || '🔔',
    kind: input.kind || 'system',
    href: input.href || null,
    read: false,
  };

  state.items = [item, ...state.items].slice(0, MAX);
  state.unread = state.items.filter((i) => !i.read).length;
  save(state);

  if (typeof Notification === 'function' && Notification.permission === 'granted') {
    try {
      const n = new Notification(item.title, {
        body: item.body,
        tag: `cricri-${item.kind}`,
        data: { href: item.href },
      });
      n.onclick = () => {
        try {
          window.focus();
          if (item.href) window.location.href = item.href;
          n.close();
        } catch {
          /* */
        }
      };
    } catch {
      /* */
    }
  }

  return item;
}

export function markAllRead() {
  const state = load();
  state.items = state.items.map((i) => ({ ...i, read: true }));
  state.unread = 0;
  save(state);
}

export function markRead(id: string) {
  const state = load();
  state.items = state.items.map((i) => (i.id === id ? { ...i, read: true } : i));
  state.unread = state.items.filter((i) => !i.read).length;
  save(state);
}

export function clearNotifications() {
  save({ items: [], unread: 0 });
}

export async function requestBrowserPermission(): Promise<boolean> {
  if (typeof Notification !== 'function') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

function getSyncMeta(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SYNC_KEY) || '{}');
  } catch {
    return {};
  }
}

function setSyncMeta(meta: Record<string, string>) {
  try {
    localStorage.setItem(SYNC_KEY, JSON.stringify(meta));
  } catch {
    /* */
  }
}

/**
 * Sincroniza avisos a partir do Supabase (Meow recebidos, novos seguidores, comentários)
 */
export async function syncRemoteNotifications(userId: string): Promise<number> {
  const meta = getSyncMeta();
  const sinceMeow = meta.meow || new Date(Date.now() - 7 * 864e5).toISOString();
  const sinceConn = meta.conn || new Date(Date.now() - 7 * 864e5).toISOString();
  const sinceComment = meta.comment || new Date(Date.now() - 7 * 864e5).toISOString();
  let added = 0;

  // Meows recebidos
  try {
    const { data } = await supabase
      .from('inbox_anon')
      .select('id, body, is_anonymous, created_at')
      .eq('to_profile_id', userId)
      .eq('is_hidden', false)
      .gt('created_at', sinceMeow)
      .order('created_at', { ascending: false })
      .limit(15);

    for (const row of data || []) {
      const r = row as { id: string; body: string; is_anonymous: boolean; created_at: string };
      const item = pushNotification({
        id: `meow_${r.id}`,
        title: r.is_anonymous ? 'Novo Meow anônimo' : 'Novo Meow',
        body: r.body,
        ico: '🐾',
        kind: 'meow',
        href: '/meow',
      });
      if (item) added += 1;
      if (r.created_at > (meta.meow || '')) meta.meow = r.created_at;
    }
  } catch {
    /* */
  }

  // Novos seguidores (connections onde sou to_id)
  try {
    const { data } = await supabase
      .from('connections')
      .select('id, from_id, created_at')
      .eq('to_id', userId)
      .gt('created_at', sinceConn)
      .order('created_at', { ascending: false })
      .limit(15);

    for (const row of data || []) {
      const r = row as { id: string; from_id: string; created_at: string };
      const item = pushNotification({
        id: `follow_${r.id}`,
        title: 'Novo seguidor',
        body: 'Alguém começou a te seguir na roda',
        ico: '✨',
        kind: 'social',
        href: `/perfil/${r.from_id}`,
      });
      if (item) added += 1;
      if (r.created_at > (meta.conn || '')) meta.conn = r.created_at;
    }
  } catch {
    /* */
  }

  // Comentários nos seus posts
  try {
    const { data: myPosts } = await supabase
      .from('posts')
      .select('id')
      .eq('author_id', userId)
      .limit(30);

    const ids = (myPosts || []).map((p: { id: string }) => p.id);
    if (ids.length) {
      const { data } = await supabase
        .from('post_comments')
        .select('id, post_id, content, created_at, author_id')
        .in('post_id', ids)
        .neq('author_id', userId)
        .gt('created_at', sinceComment)
        .order('created_at', { ascending: false })
        .limit(15);

      for (const row of data || []) {
        const r = row as {
          id: string;
          post_id: string;
          content: string;
          created_at: string;
        };
        const item = pushNotification({
          id: `cmt_${r.id}`,
          title: 'Novo comentário',
          body: r.content,
          ico: '💬',
          kind: 'social',
          href: `/post/${r.post_id}`,
        });
        if (item) added += 1;
        if (r.created_at > (meta.comment || '')) meta.comment = r.created_at;
      }
    }
  } catch {
    /* */
  }

  setSyncMeta(meta);
  if (added > 0) playSfx('meow');
  return added;
}

/** Atalhos para eventos locais do app */
export function notifyLike(postId: string) {
  pushNotification({
    title: 'Alguém curtiu seu post',
    body: 'Seu mural está aquecendo',
    ico: '❤️',
    kind: 'social',
    href: `/post/${postId}`,
    id: `like_local_${postId}_${Date.now()}`,
  });
}

export function notifyMeowSent() {
  pushNotification({
    title: 'Meow enviado',
    body: '+12 XP na roda',
    ico: '🐾',
    kind: 'meow',
    href: '/meow',
  });
}
