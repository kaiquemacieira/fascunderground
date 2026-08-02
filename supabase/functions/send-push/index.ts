// FASC+ · Edge Function — envio Web Push (API backend only)
// Deploy: supabase functions deploy send-push
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
//          FASC_PUSH_HOOK_SECRET (opcional mas recomendado)
//          FASC_CORS_ORIGINS (csv, opcional)
//
// Auth obrigatória: Bearer service_role OU header x-fasc-hook-secret.
// Nunca chame esta function do browser com a anon key.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import webpush from "npm:web-push@3.6.7";
import {
  assertBackendAuth,
  corsHeaders,
  isUuid,
  jsonResponse,
  readJsonLimited,
  safeNotifyText,
  safeUrlPath,
} from "../_shared/security.ts";

interface PushBody {
  user_id?: string;
  user_ids?: string[];
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
  data?: Record<string, unknown>;
}

const MAX_RECIPIENTS = 50;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405, req);
  }

  const auth = assertBackendAuth(req);
  if (!auth.ok) {
    return jsonResponse({ error: auth.error }, auth.status, req);
  }

  try {
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") || "";
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") || "";
    const vapidSubject =
      Deno.env.get("VAPID_SUBJECT") || "mailto:security@localhost";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!vapidPublic || !vapidPrivate || !supabaseUrl || !serviceKey) {
      console.error("[send-push] missing env");
      return jsonResponse({ error: "server misconfigured" }, 500, req);
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const parsed = await readJsonLimited<PushBody>(req, 32_768);
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error }, 400, req);
    }
    const payload = parsed.data;

    const ids = new Set<string>();
    if (payload.user_id && isUuid(payload.user_id)) ids.add(payload.user_id);
    if (Array.isArray(payload.user_ids)) {
      for (const id of payload.user_ids) {
        if (isUuid(id)) ids.add(id);
        if (ids.size > MAX_RECIPIENTS) break;
      }
    }
    if (!ids.size) {
      return jsonResponse({ error: "user_id or user_ids required" }, 400, req);
    }
    if (ids.size > MAX_RECIPIENTS) {
      return jsonResponse({ error: "too many recipients" }, 400, req);
    }

    const notification = {
      title: safeNotifyText(payload.title, 80) || "FASC+",
      body: safeNotifyText(payload.body, 180),
      url: safeUrlPath(payload.url, "/profile.html"),
      tag: safeNotifyText(payload.tag, 40) || "fasc",
      icon: "/favicon.ico",
    };

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: rows, error } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_id")
      .in("user_id", [...ids]);

    if (error) {
      console.error("[send-push] db", error.message);
      return jsonResponse({ error: "db error" }, 500, req);
    }

    const results: Array<{ user_id: string; ok: boolean; code?: number }> = [];

    for (const row of rows || []) {
      const subscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };
      try {
        const res = await webpush.sendNotification(
          subscription,
          JSON.stringify(notification),
          { TTL: 60 * 60, urgency: "normal" },
        );
        results.push({ user_id: row.user_id, ok: true, code: res.statusCode });
      } catch (err: unknown) {
        const e = err as { statusCode?: number };
        if (e.statusCode === 404 || e.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", row.id);
        }
        results.push({ user_id: row.user_id, ok: false, code: e.statusCode });
      }
    }

    return jsonResponse(
      {
        sent: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
      },
      200,
      req,
    );
  } catch (err) {
    console.error("[send-push]", (err as Error).message || err);
    return jsonResponse({ error: "internal error" }, 500, req);
  }
});
