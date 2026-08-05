# CRICRI · Web Push — setup

## 1. Gerar chaves VAPID

```bash
npx web-push generate-vapid-keys
```

Saída: `Public Key` + `Private Key`.

## 2. Front (chave pública)

Em `js/config.js`:

```js
vapidPublicKey: 'SUA_PUBLIC_KEY_AQUI',
```

## 3. Supabase secrets (chave privada)

```bash
supabase secrets set VAPID_PUBLIC_KEY="..."
supabase secrets set VAPID_PRIVATE_KEY="..."
supabase secrets set VAPID_SUBJECT="mailto:seu@email.com"
supabase secrets set FASC_PUSH_HOOK_SECRET="um-segredo-longo"
```

`SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_URL` já vêm no runtime das functions.

## 4. Deploy das Edge Functions

```bash
supabase functions deploy send-push
supabase functions deploy push-trigger --no-verify-jwt
```

## 5. Database Webhooks (Dashboard → Database → Webhooks)

| Tabela | Evento | URL |
|--------|--------|-----|
| `connections` | INSERT | `https://<ref>.supabase.co/functions/v1/push-trigger` |
| `inbox_anon` | INSERT | idem |
| `posts` | INSERT | idem |

Header: `Authorization: Bearer <service_role>`  
ou `x-fasc-hook-secret: <FASC_PUSH_HOOK_SECRET>`

## 6. SQL

Já existe: `202608020008_push_subscriptions.sql`  
Incoming connections: `202608050002_connections_incoming_select.sql`

## 7. Teste no app

1. Login → Perfil → **Ativar notificações**
2. Aceitar permissão do browser
3. Conferir linha em `push_subscriptions`
4. Outra conta te adiciona → push "Nova conexão"

## Arquivos

- `sw.js` — recebe push e mostra notificação
- `js/push.js` — subscribe + upsert
- `supabase/functions/send-push` — envio manual
- `supabase/functions/push-trigger` — webhook → push
