# send-push

## Deploy

```bash
# gerar chaves (se ainda não tiver)
npx web-push generate-vapid-keys

supabase functions deploy send-push

supabase secrets set \
  VAPID_PUBLIC_KEY="BBvmr6tIC0YWjrN4C6jmEmcIhGB8ho5DfQI_tZ4wa1-sAayKfF8xUqlw-cZKIN19pS9PzyECL6rcNf521pRESBg" \
  VAPID_PRIVATE_KEY="y-c2l1ojJ-Og_72p0F2SZWZblS1XmleoCDQ8_p-sfK8" \
  VAPID_SUBJECT="mailto:voce@seudominio.com"
```

A chave **pública** deve ser a mesma de `js/config.js` → `vapidPublicKey`.

## Teste

```bash
curl -X POST "$SUPABASE_URL/functions/v1/send-push" \
  -H "Authorization: Bearer USER_ACCESS_TOKEN" \
  -H "apikey: ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to_user_id":"UUID","title":"Teste","body":"Olá da roda","url":"/index.html"}'
```
