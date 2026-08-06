import { createClient } from '@supabase/supabase-js';

// Mesmas chaves públicas do web (js/config.js) — só anon key
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bcnbwshwehofncfkdnra.supabase.co';
const SUPABASE_ANON =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_k0iCZgl6qweP16tW3uiGYA_HTJYO1iK';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

export async function fetchSpots() {
  try {
    const { data, error } = await supabase
      .from('spots')
      .select('id,slug,name,lat,lng,radius_m,status')
      .order('name');
    if (error) throw error;
    if (!data?.length) return null;
    return data.map((row) => ({
      id: row.slug || row.id,
      name: row.name,
      lat: Number(row.lat),
      lng: Number(row.lng),
      radius: Number(row.radius_m ?? 90),
      status: row.status || 'sem info',
    }));
  } catch (e) {
    console.warn('[CRICRI native spots]', e.message || e);
    return null;
  }
}

export async function submitRoleRequest(payload) {
  const { data, error } = await supabase.from('role_requests').insert(payload).select('id').maybeSingle();
  if (error) throw error;
  return data;
}
