// CRICRI · Edge Function: pedido de Rolê/After
// Destino do e-mail: SOMENTE secret ROLE_REQUEST_TO_EMAIL (ou DENUNCIA_TO_EMAIL).
// Nunca exponha o e-mail no front.
//
// Deploy:
//   supabase functions deploy role-request --no-verify-jwt
//   supabase secrets set ROLE_REQUEST_TO_EMAIL="seu@email.com"
// Opcional: RESEND_API_KEY, ROLE_REQUEST_FROM (ou DENUNCIA_FROM)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { verifyRecaptcha } from "../_shared/recaptcha.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const KINDS = ["role", "after", "rolê", "rolê/after"] as const;

const RoleRequestSchema = z.object({
  title: z
    .string({ required_error: "Título obrigatório." })
    .trim()
    .min(2, "Título muito curto.")
    .max(120, "Título muito longo."),
  kind: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .default("role"),
  when_text: z.string().trim().max(200).optional().nullable().default(null),
  notes: z.string().trim().max(2000).optional().nullable().default(null),
  contact: z.string().trim().max(120).optional().nullable().default(null),
  lat: z.number({ required_error: "Latitude obrigatória." }).min(-90).max(90),
  lng: z.number({ required_error: "Longitude obrigatória." }).min(-180).max(180),
  handle: z.string().trim().max(64).optional().nullable().default(null),
  user_id: z.string().uuid().optional().nullable().default(null),
  id: z.string().optional().nullable().default(null),
  saved: z.boolean().optional().default(false),
  website: z.string().optional(), // honeypot
  path: z.string().max(120).optional().default(""),
  ua: z.string().max(200).optional().default(""),
  recaptchaToken: z.string().max(4000).optional().default(""),
});

function fieldsFromZod(err: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] || "form");
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const to =
    Deno.env.get("ROLE_REQUEST_TO_EMAIL")?.trim() ||
    Deno.env.get("DENUNCIA_TO_EMAIL")?.trim();
  if (!to) {
    console.error("ROLE_REQUEST_TO_EMAIL / DENUNCIA_TO_EMAIL ausente");
    return json({ error: "canal não configurado" }, 503);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "json inválido" }, 400);
  }

  if (raw && typeof raw === "object" && (raw as { website?: string }).website) {
    return json({ ok: true });
  }

  const token =
    raw && typeof raw === "object"
      ? String((raw as { recaptchaToken?: string }).recaptchaToken || "")
      : "";
  const captcha = await verifyRecaptcha(token, "role_request", 0.4);
  if (!captcha.ok) {
    return json({ error: "captcha", code: captcha.error || "captcha" }, 403);
  }

  const parsed = RoleRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      { error: "validação", fields: fieldsFromZod(parsed.error) },
      400,
    );
  }

  const d = parsed.data;
  const kindLabel = /after/i.test(d.kind) ? "After" : "Rolê";
  const subject = `[CRICRI] Solicitar ${kindLabel}: ${d.title}`;
  const mapUrl =
    `https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lng}#map=17/${d.lat}/${d.lng}`;

  const text = [
    `Nova solicitação de ${kindLabel} no mapa CRICRI`,
    "",
    `Título: ${d.title}`,
    `Tipo: ${d.kind}`,
    `Quando: ${d.when_text || "—"}`,
    `Contato: ${d.contact || "—"}`,
    `Nick: ${d.handle ? "@" + d.handle : "—"}`,
    `User id: ${d.user_id || "—"}`,
    `Coords: ${d.lat}, ${d.lng}`,
    `Mapa: ${mapUrl}`,
    "",
    "Detalhes:",
    d.notes || "—",
    "",
    d.saved || d.id ? `(registro: ${d.id || "salvo"})` : "(só notificação)",
    `Path: ${d.path || "—"}`,
    `UA: ${d.ua || "—"}`,
  ].join("\n");

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from =
    Deno.env.get("ROLE_REQUEST_FROM") ||
    Deno.env.get("DENUNCIA_FROM") ||
    "CRICRI <onboarding@resend.dev>";

  if (resendKey) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!r.ok) {
      console.error("Resend error", r.status, await r.text());
      return json({ error: "falha ao enviar" }, 502);
    }
    return json({ ok: true });
  }

  // Sem Resend: registra no log da function (visível no dashboard Supabase)
  console.log(JSON.stringify({
    channel: "role-request",
    to_configured: true,
    subject,
    kind: d.kind,
    title: d.title,
    lat: d.lat,
    lng: d.lng,
    at: new Date().toISOString(),
  }));
  console.log(text);

  return json({ ok: true, queued: "log" });
});
