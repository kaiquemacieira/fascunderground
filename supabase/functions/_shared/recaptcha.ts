/**
 * Verifica token reCAPTCHA v3 com a API do Google.
 * Secret: RECAPTCHA_SECRET_KEY (nunca no front).
 * Em dev, se o secret não existir, retorna { ok: true, skipped: true }.
 */
export type RecaptchaResult = {
  ok: boolean;
  score?: number;
  action?: string;
  skipped?: boolean;
  error?: string;
};

export async function verifyRecaptcha(
  token: string | null | undefined,
  expectedAction?: string,
  minScore = 0.5,
): Promise<RecaptchaResult> {
  const secret = Deno.env.get("RECAPTCHA_SECRET_KEY")?.trim();
  if (!secret) {
    // Dev / ainda não configurado — não bloqueia
    return { ok: true, skipped: true };
  }

  if (!token || typeof token !== "string" || token.length < 20) {
    return { ok: false, error: "captcha_missing" };
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);

    const r = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!r.ok) {
      console.error("[recaptcha] siteverify HTTP", r.status);
      return { ok: false, error: "captcha_upstream" };
    }
    const data = await r.json() as {
      success?: boolean;
      score?: number;
      action?: string;
      "error-codes"?: string[];
    };
    if (!data.success) {
      console.warn("[recaptcha] fail", data["error-codes"]);
      return { ok: false, error: "captcha_invalid" };
    }
    const score = typeof data.score === "number" ? data.score : 1;
    if (score < minScore) {
      console.warn("[recaptcha] low score", score, data.action);
      return { ok: false, score, action: data.action, error: "captcha_score" };
    }
    if (expectedAction && data.action && data.action !== expectedAction) {
      console.warn("[recaptcha] action mismatch", data.action, expectedAction);
      return { ok: false, score, action: data.action, error: "captcha_action" };
    }
    return { ok: true, score, action: data.action };
  } catch (e) {
    console.error("[recaptcha] exception", e);
    return { ok: false, error: "captcha_error" };
  }
}
