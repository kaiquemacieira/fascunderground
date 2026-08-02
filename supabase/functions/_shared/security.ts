// FASC+ · helpers de segurança para Edge Functions
// Nunca logar secrets, service_role, VAPID private ou corpos de subscription.

const encoder = new TextEncoder();

/** Comparação em tempo constante (mitiga timing attacks em tokens). */
export function timingSafeEqual(a: string, b: string): boolean {
  const ba = encoder.encode(a);
  const bb = encoder.encode(b);
  if (ba.length !== bb.length) {
    // ainda compara para não vazar tamanho por tempo óbvio em caminhos curtos
    let dummy = 0;
    const longer = ba.length > bb.length ? ba : bb;
    for (let i = 0; i < longer.length; i++) dummy |= longer[i];
    return dummy < 0; // sempre false
  }
  let out = 0;
  for (let i = 0; i < ba.length; i++) out |= ba[i] ^ bb[i];
  return out === 0;
}

/** Extrai Bearer token do header Authorization. */
export function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

/**
 * Autoriza chamada de backend:
 * 1) Authorization Bearer === SERVICE_ROLE_KEY, ou
 * 2) Header x-fasc-hook-secret === FASC_PUSH_HOOK_SECRET
 *
 * Webhooks do Dashboard devem enviar service role.
 * Triggers pg_net / CI devem usar o hook secret (preferível no Vault).
 */
export function assertBackendAuth(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const hookSecret = Deno.env.get("FASC_PUSH_HOOK_SECRET") || "";
  const token = bearerToken(req);
  const hookHeader =
    req.headers.get("x-fasc-hook-secret") ||
    req.headers.get("X-Fasc-Hook-Secret") ||
    "";

  if (serviceKey && token && timingSafeEqual(token, serviceKey)) {
    return { ok: true };
  }
  if (hookSecret && hookHeader && timingSafeEqual(hookHeader, hookSecret)) {
    return { ok: true };
  }

  // apikey header às vezes vem com service_role nos webhooks
  const apiKey = req.headers.get("apikey") || "";
  if (serviceKey && apiKey && timingSafeEqual(apiKey, serviceKey)) {
    return { ok: true };
  }

  return { ok: false, status: 401, error: "unauthorized" };
}

/** CORS restrito: lista em FASC_CORS_ORIGINS (csv). Vazio = só same-origin / sem * . */
export function corsHeaders(req: Request): Record<string, string> {
  const allowed = (Deno.env.get("FASC_CORS_ORIGINS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = req.headers.get("Origin") || "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-fasc-hook-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  // Sem Origin (server-to-server): não precisa de ACAO
  return headers;
}

export function jsonResponse(
  body: unknown,
  status: number,
  req: Request,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}

/** Limite de tamanho do body (bytes). */
export async function readJsonLimited<T = unknown>(
  req: Request,
  maxBytes = 32_768,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const cl = req.headers.get("content-length");
  if (cl && Number(cl) > maxBytes) {
    return { ok: false, error: "payload too large" };
  }
  const buf = await req.arrayBuffer();
  if (buf.byteLength > maxBytes) {
    return { ok: false, error: "payload too large" };
  }
  try {
    const data = JSON.parse(new TextDecoder().decode(buf)) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, error: "invalid json" };
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export function clampStr(v: unknown, max: number, fallback = ""): string {
  if (v == null) return fallback;
  const s = String(v).trim();
  if (!s) return fallback;
  return s.length > max ? s.slice(0, max) : s;
}

/** Sanitiza título/corpo de notificação (sem HTML). */
export function safeNotifyText(v: unknown, max: number): string {
  return clampStr(v, max)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[<>]/g, "");
}

export function safeUrlPath(v: unknown, fallback = "/"): string {
  const s = clampStr(v, 512, fallback);
  // só path relativo do próprio app — bloqueia javascript: e URLs absolutas externas
  if (!s.startsWith("/") || s.startsWith("//")) return fallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return fallback;
  return s;
}
