/**
 * CRICRI · Edge Function send-push
 *
 * Secrets (Dashboard → Edge Functions → Secrets ou CLI):
 *   VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT=mailto:voce@dominio.com
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (injetados pelo runtime)
 *
 * Body JSON (Authorization: Bearer <user access token>):
 * {
 *   "to_user_id": "uuid",   // obrigatório
 *   "title": "CRICRI",
 *   "body": "texto",
 *   "url": "/profile.html",
 *   "tag": "friend-request"
 * }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') || '';
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:cricri@localhost';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!vapidPublic || !vapidPrivate) {
      return json({ error: 'VAPID secrets missing' }, 500);
    }
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Supabase env missing' }, 500);
    }

    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: 'Invalid session' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const toUserId = String(body.to_user_id || body.user_id || '').trim();
    if (!toUserId) {
      return json({ error: 'to_user_id required' }, 400);
    }

    const title = String(body.title || 'CRICRI').slice(0, 80);
    const message = String(body.body || body.message || 'Nova atividade na roda').slice(0, 180);
    const url = String(body.url || body.href || '/index.html').slice(0, 300);
    const tag = String(body.tag || 'cricri').slice(0, 64);

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: subs, error: subErr } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', toUserId);

    if (subErr) {
      return json({ error: subErr.message }, 500);
    }
    if (!subs || !subs.length) {
      return json({ ok: true, sent: 0, detail: 'no subscriptions' });
    }

    const payload = JSON.stringify({ title, body: message, url, tag });
    let sent = 0;
    const stale: string[] = [];

    for (const s of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload,
          { TTL: 60 * 60 }
        );
        sent++;
      } catch (e: unknown) {
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          stale.push(s.endpoint);
        }
        console.warn('[send-push] fail', status, (e as Error)?.message);
      }
    }

    if (stale.length) {
      await admin.from('push_subscriptions').delete().in('endpoint', stale);
    }

    return json({ ok: true, sent, stale: stale.length, from: userData.user.id });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error)?.message || 'server error' }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
