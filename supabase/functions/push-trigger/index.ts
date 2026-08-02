// CRICRI · Edge Function — Database Webhook → Web Push
// Deploy: supabase functions deploy push-trigger --no-verify-jwt
// Auth: Bearer service_role OU x-fasc-hook-secret (obrigatório um dos dois)
//
// Dashboard → Database → Webhooks:
//   inbox_anon INSERT → push-trigger (+ auth header service role)
//   connections INSERT → push-trigger (opcional)
//   posts INSERT → push-trigger  ← mural / feed

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
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

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
};

type NotifyJob = {
  user_id: string;
  title: string;
  body: string;
  url: string;
  tag: string;
};

const ALLOWED_TABLES = new Set([
  "inbox_anon",
  "connections",
  "posts",
  "post_comments",
  "post_likes",
]);

const MAX_POST_NOTIFY = 40;

function jobsFromWebhook(payload: WebhookPayload): NotifyJob[] {
  const table = (payload.table || "").toLowerCase();
  const type = payload.type;
  const rec = payload.record || {};

  if (payload.schema && payload.schema !== "public") return [];
  if (!ALLOWED_TABLES.has(table) && table !== "_direct") return [];

  if (table === "inbox_anon" && type === "INSERT") {
    const to = String(rec.to_profile_id || "");
    if (!isUuid(to)) return [];
    const anon = rec.is_anonymous !== false;
    const snippet = safeNotifyText(rec.body, 80);
    return [
      {
        user_id: to,
        title: "Novo recado na caixinha",
        body: snippet || (anon ? "Alguém mandou um recado anônimo." : "Novo recado."),
        url: "/profile.html",
        tag: "inbox",
      },
    ];
  }

  if (table === "connections" && type === "INSERT") {
    const to = String(rec.to_id || "");
    if (!isUuid(to)) return [];
    return [
      {
        user_id: to,
        title: "Nova conexão no CRICRI",
        body: "Alguém te adicionou às conexões.",
        url: "/profile.html",
        tag: "connections",
      },
    ];
  }

  // posts / comments / likes: expandidos async em expandJobs (precisam de queries)
  if (table === "posts" || table === "post_comments" || table === "post_likes") {
    return [];
  }

  if (table === "_direct") {
    const to = String(rec.user_id || "");
    if (!isUuid(to)) return [];
    return [
      {
        user_id: to,
        title: safeNotifyText(rec.title, 80) || "CRICRI",
        body: safeNotifyText(rec.body, 180),
        url: safeUrlPath(rec.url, "/"),
        tag: safeNotifyText(rec.tag, 40) || "cricri",
      },
    ];
  }

  return [];
}

/** Resolve destinatários que dependem de SELECT (posts → conexões, etc.) */
async function expandJobs(
  admin: SupabaseClient,
  payload: WebhookPayload,
): Promise<NotifyJob[]> {
  const table = (payload.table || "").toLowerCase();
  const type = payload.type;
  const rec = payload.record || {};
  const jobs: NotifyJob[] = [];

  // —— Novo post no mural: notifica quem adicionou o autor às conexões ——
  if (table === "posts" && type === "INSERT") {
    const authorId = String(rec.author_id || "");
    if (!isUuid(authorId)) return [];

    const content = safeNotifyText(rec.content, 100);
    const place = safeNotifyText(rec.place_name, 40);

    let authorLabel = "Alguém";
    try {
      const { data: prof } = await admin
        .from("profiles")
        .select("name, handle")
        .eq("id", authorId)
        .maybeSingle();
      if (prof) {
        authorLabel = (prof.handle || prof.name || authorLabel).toString();
      }
    } catch (_) {
      /* ignore */
    }

    // from_id adicionou to_id (= author) → from_id quer saber quando o autor posta
    const { data: conns, error } = await admin
      .from("connections")
      .select("from_id")
      .eq("to_id", authorId)
      .limit(MAX_POST_NOTIFY);

    if (error) {
      console.warn("[push-trigger] connections lookup", error.message);
    }

    const recipients = new Set<string>();
    for (const row of conns || []) {
      const id = String(row.from_id || "");
      if (isUuid(id) && id !== authorId) recipients.add(id);
    }

    // Sem conexões: não spam global — só log
    if (!recipients.size) {
      console.info("[push-trigger] posts INSERT sem destinatários de conexão", authorId);
      return [];
    }

    const bodyParts = [content || "novo cartaz no mural"];
    if (place) bodyParts.push("· " + place);

    for (const userId of recipients) {
      jobs.push({
        user_id: userId,
        title: `@${authorLabel} no mural`,
        body: bodyParts.join(" "),
        url: "/#feed",
        tag: "posts",
      });
    }
    return jobs;
  }

  // —— Comentário em post: notifica o autor do post ——
  if (table === "post_comments" && type === "INSERT") {
    const postId = rec.post_id;
    const commenterId = String(rec.author_id || "");
    if (postId == null || !isUuid(commenterId)) return [];

    const { data: post } = await admin
      .from("posts")
      .select("id, author_id, content")
      .eq("id", postId)
      .maybeSingle();

    if (!post || !isUuid(String(post.author_id))) return [];
    if (String(post.author_id) === commenterId) return []; // não notifica a si

    const snippet = safeNotifyText(rec.content, 80);
    jobs.push({
      user_id: String(post.author_id),
      title: "Novo comentário no seu post",
      body: snippet || "Alguém comentou no mural.",
      url: "/#feed",
      tag: "post-comment",
    });
    return jobs;
  }

  // —— Like: notifica o autor do post (1× por like) ——
  if (table === "post_likes" && type === "INSERT") {
    const postId = rec.post_id;
    const likerId = String(rec.user_id || "");
    if (postId == null || !isUuid(likerId)) return [];

    const { data: post } = await admin
      .from("posts")
      .select("id, author_id")
      .eq("id", postId)
      .maybeSingle();

    if (!post || !isUuid(String(post.author_id))) return [];
    if (String(post.author_id) === likerId) return [];

    jobs.push({
      user_id: String(post.author_id),
      title: "Curtida no mural",
      body: "Alguém curtiu seu cartaz.",
      url: "/#feed",
      tag: "post-like",
    });
    return jobs;
  }

  return jobs;
}

async function sendToUser(
  admin: SupabaseClient,
  job: NotifyJob,
): Promise<{ sent: number; failed: number }> {
  const { data: rows, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", job.user_id)
    .limit(10);

  if (error || !rows?.length) return { sent: 0, failed: 0 };

  const notification = {
    title: job.title,
    body: job.body,
    url: job.url,
    tag: job.tag,
    icon: "/favicon.ico",
  };

  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        JSON.stringify(notification),
        { TTL: 60 * 60, urgency: "normal" },
      );
      sent++;
    } catch (err: unknown) {
      failed++;
      const e = err as { statusCode?: number };
      if (e.statusCode === 404 || e.statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", row.id);
      }
    }
  }
  return { sent, failed };
}

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
      console.error("[push-trigger] missing env");
      return jsonResponse({ error: "server misconfigured" }, 500, req);
    }

    if (!Deno.env.get("FASC_PUSH_HOOK_SECRET")) {
      console.warn("[push-trigger] FASC_PUSH_HOOK_SECRET not set");
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const parsed = await readJsonLimited<WebhookPayload | Record<string, unknown>>(
      req,
      65_536,
    );
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error }, 400, req);
    }
    const payload = parsed.data;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let jobs: NotifyJob[] = [];
    if (
      payload &&
      typeof payload === "object" &&
      "type" in payload &&
      "table" in payload
    ) {
      const wh = payload as WebhookPayload;
      jobs = jobsFromWebhook(wh);
      // posts / comments / likes precisam de expand
      const expanded = await expandJobs(admin, wh);
      if (expanded.length) jobs = jobs.concat(expanded);
    } else {
      jobs = jobsFromWebhook({
        type: "INSERT",
        table: "_direct",
        schema: "public",
        record: payload as Record<string, unknown>,
        old_record: null,
      });
    }

    if (!jobs.length) {
      return jsonResponse({ skipped: true, reason: "no jobs" }, 200, req);
    }

    // dedupe por user_id + tag
    const seen = new Set<string>();
    const unique: NotifyJob[] = [];
    for (const j of jobs) {
      const k = j.user_id + "|" + j.tag;
      if (seen.has(k)) continue;
      seen.add(k);
      unique.push(j);
    }

    const summary = [];
    for (const job of unique) {
      const r = await sendToUser(admin, job);
      summary.push({ user_id: job.user_id, tag: job.tag, ...r });
    }

    return jsonResponse({ ok: true, jobs: unique.length, summary }, 200, req);
  } catch (err) {
    console.error("[push-trigger]", (err as Error).message || err);
    return jsonResponse({ error: "internal error" }, 500, req);
  }
});
