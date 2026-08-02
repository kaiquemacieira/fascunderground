# Canal de denúncia (e-mail oculto)

O front **não** contém o e-mail de destino.

## Deploy

```bash
supabase functions deploy denuncia --no-verify-jwt
supabase secrets set DENUNCIA_TO_EMAIL="SEU_EMAIL_AQUI"
```

Opcional (envio real de e-mail via Resend):

```bash
supabase secrets set RESEND_API_KEY="re_xxx"
supabase secrets set DENUNCIA_FROM="CRICRI <onboarding@resend.dev>"
```

Sem `RESEND_API_KEY`, a function grava o relato nos **logs** da function (Dashboard).

## Front

`js/denuncia.js` só chama:

`{supabaseUrl}/functions/v1/denuncia`
