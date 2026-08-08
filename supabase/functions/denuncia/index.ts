// CRICRI · Edge Function: denúncia (validação Zod)
// Destino do e-mail: SOMENTE secret DENUNCIA_TO_EMAIL (nunca no front).
// Deploy:
//   supabase functions deploy denuncia --no-verify-jwt
//   supabase secrets set DENUNCIA_TO_EMAIL="…"
// Opcional: RESEND_API_KEY, DENUNCIA_FROM

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

const TIPOS = ["assedio", "violencia", "furto", "estrutura", "outro"] as const;

const DenunciaSchema = z
  .object({
    tipo: z.enum(TIPOS, {
      errorMap: () => ({ message: "Escolha um tipo válido." }),
    }),
    relato: z
      .string({ required_error: "Descreva o que aconteceu." })
      .trim()
      .min(10, "Relato muito curto (mín. 10).")
      .max(2000, "Relato muito longo (máx. 2000).")
      .refine((v) => !/^(.)\1{9,}$/.test(v), {
        message: "Escreva um relato com sentido.",
      }),
    local: z
      .string()
      .trim()
      .max(120, "Local: máximo 120 caracteres.")
      .optional()
      .default(""),
    contato: z
      .string()
      .trim()
      .max(120, "Contato: máximo 120 caracteres.")
      .optional()
      .default(""),
    anonimo: z.boolean().optional().default(true),
    website: z.string().optional(), // honeypot
    path: z.string().max(80).optional().default(""),
    ua: z.string().max(160).optional().default(""),
    recaptchaToken: z.string().max(4000).optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.anonimo) return;
    const c = data.contato || "";
    if (!c) return;
    if (c.includes("@")) {
      if (!z.string().email().safeParse(c).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contato"],
          message: "E-mail de contato inválido.",
        });
      }
      return;
    }
    const digits = c.replace(/\D/g, "");
    const looksPhone = /^[\d\s()+-]+$/.test(c) && digits.length > 0;
    if (looksPhone && (digits.length < 8 || digits.length > 13)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contato"],
        message: "Telefone parece incompleto.",
      });
    }
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

  const to = Deno.env.get("DENUNCIA_TO_EMAIL")?.trim();
  if (!to) {
    console.error("DENUNCIA_TO_EMAIL secret ausente");
    return json({ error: "canal não configurado" }, 503);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "json inválido" }, 400);
  }

  // honeypot antes do parse estrito
  if (raw && typeof raw === "object" && (raw as { website?: string }).website) {
    return json({ ok: true });
  }

  const token =
    raw && typeof raw === "object"
      ? String((raw as { recaptchaToken?: string }).recaptchaToken || "")
      : "";
  const captcha = await verifyRecaptcha(token, "denuncia", 0.4);
  if (!captcha.ok) {
    return json({ error: "captcha", code: captcha.error || "captcha" }, 403);
  }

  const parsed = DenunciaSchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      { error: "validação", fields: fieldsFromZod(parsed.error) },
      400,
    );
  }

  const data = parsed.data;
  const contato = data.anonimo ? "" : data.contato;

  const subject =
    `[CRICRI denúncia] ${data.tipo}${data.local ? " · " + data.local : ""}`;
  const text = [
    `Tipo: ${data.tipo}`,
    `Local: ${data.local || "—"}`,
    `Anônimo: ${data.anonimo ? "sim" : "não"}`,
    `Contato: ${data.anonimo ? "(oculto)" : contato || "—"}`,
    `Path: ${data.path || "—"}`,
    `UA: ${data.ua || "—"}`,
    "",
    "Relato:",
    data.relato,
  ].join("\n");

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("DENUNCIA_FROM") || "CRICRI <onboarding@resend.dev>";

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

  console.log(JSON.stringify({
    channel: "denuncia",
    to_configured: true,
    subject,
    tipo: data.tipo,
    local: data.local,
    anonimo: data.anonimo,
    relato_len: data.relato.length,
    at: new Date().toISOString(),
  }));
  console.log(text);

  return json({ ok: true, queued: "log" });
});
