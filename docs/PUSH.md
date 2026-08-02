# Web Push — FASC+

Notificações push no navegador (Chrome, Edge, Firefox, Safari 16.4+ em HTTPS).

## O que está no código

| Arquivo | Função |
|---------|--------|
| `sw.js` | Service Worker: evento `push` + clique na notificação |
| `js/push.js` | Permissão, subscribe, salva no Supabase, UI Ativar/Desativar |
| `supabase/STEP_G_push_subscriptions.sql` | Tabela + RLS |
| `supabase/migrations/202608020008_push_subscriptions.sql` | Mesmo schema em migration |
| `supabase/functions/send-push/` | Edge Function (envio com chave **privada**) |
| `profile.html` | Card **Notificações** com botões |

## Fluxo

1. Usuário logado → **Perfil → Ativar notificações** → browser pede permissão.
2. Front cria `PushSubscription` com a **chave pública VAPID**.
3. Endpoint + keys (`p256dh`, `auth`) vão para `public.push_subscriptions` (RLS: só o dono).
4. Backend (Edge Function) usa a **chave privada VAPID** + `web-push` para disparar.
5. `sw.js` recebe o `push` e mostra a notificação; clique abre a URL do payload.

## Setup passo a passo

### 1. SQL

No Dashboard Supabase → SQL Editor:

```text
supabase/STEP_G_push_subscriptions.sql
```

Conferir:

```sql
select tablename from pg_tables
where schemaname = 'public' and tablename = 'push_subscriptions';
```

### 2. Gerar chaves VAPID

```bash
npx web-push generate-vapid-keys
```

Saída exemplo:

```text
Public Key:  BNxxxx...
Private Key: xxxxx...
```

- **Pública** → front (`window.FASC_VAPID_PUBLIC_KEY`)
- **Privada** → só secrets da Edge Function / servidor (**nunca** no git nem no browser)

### 3. Front — chave pública

Em `profile.html` (e `index.html` se quiser registrar SW cedo), **antes** de `js/push.js`:

```html
<script>
  window.FASC_VAPID_PUBLIC_KEY = 'COLE_A_CHAVE_PUBLICA_AQUI';
</script>
<script src="js/push.js"></script>
```

Ou em `js/config.js`:

```js
window.FASC_CONFIG = {
  // ...
  vapidPublicKey: 'COLE_A_CHAVE_PUBLICA_AQUI'
};
```

### 4. HTTPS

Push **não** funciona em `file://`. Use:

```bash
npx serve -l 4173 .
```

ou domínio HTTPS de produção.

### 5. No app

1. Entre na conta.
2. Perfil → **Ativar notificações**.
3. Aceite o prompt do browser.
4. Status deve mudar para “Notificações ativas neste aparelho.”

### 6. Edge Function (envio)

```bash
# na pasta do projeto, com Supabase CLI
supabase functions deploy send-push
supabase secrets set VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..." VAPID_SUBJECT="mailto:voce@dominio.com"
```

A function usa `SUPABASE_SERVICE_ROLE_KEY` (já injetada no runtime das Edge Functions) para ler `push_subscriptions` sem RLS.

**Payload esperado (POST JSON):**

```json
{
  "user_id": "uuid-do-destinatario",
  "title": "Novo recado",
  "body": "Alguém mandou na sua caixinha",
  "url": "/profile.html",
  "tag": "inbox"
}
```

Ou para vários:

```json
{
  "user_ids": ["uuid1", "uuid2"],
  "title": "FASC+",
  "body": "Spot atualizado",
  "url": "/#mapa"
}
```

### 7. Gatilhos naturais (produto)

- Nova linha em `inbox_anon` → notificar `to_profile_id`
- Nova `connections` → notificar `to_id` (opcional; RLS atual esconde do destinatário — ajuste de produto)
- Mudança de `spots.status` (broadcast seletivo / admin)

Implemente o gatilho com Database Webhook → Edge Function, ou chame a function do seu backend após o insert.

## Segurança

- A **anon key** e a **VAPID public** podem ficar no front.
- **VAPID private** e **service_role** só no servidor / secrets.
- RLS: usuário só lê/escreve as próprias linhas em `push_subscriptions`.
- Envio em massa: rate-limit na Edge Function (não está no esqueleto mínimo).

## Limitação honesta

O **recebimento** (SW + subscription + UI) está no app.  
O **disparo** depende de você configurar VAPID + Edge Function (ou outro backend). O browser **não** envia push sozinho com a chave privada.

## Debug rápido

| Sintoma | Causa comum |
|---------|-------------|
| “Falta a chave pública VAPID” | Não setou `FASC_VAPID_PUBLIC_KEY` |
| “Push exige HTTPS” | Abriu via `file://` |
| “Bloqueadas pelo navegador” | Permission denied — resetar no cadeado da URL |
| Subscription some após restart | Normal em alguns browsers; `push.js` recria no Ativar |
| Edge 401/403 | Secret VAPID ou service_role ausente |
| Tabela 42501 | Não rodou o SQL / grants |

Console esperado no perfil (após ativar):

```text
[FASC SW] install fasc-sw-v1
[FASC push] pronto
```

## Gatilhos (Edge Functions)

Há **duas** functions:

| Function | Uso |
|----------|-----|
| `send-push` | API direta: `{ user_id, title, body, url }` |
| `push-trigger` | Database Webhook: payload `{ type, table, record }` |

### Eventos mapeados em `push-trigger`

| Tabela | Evento | Quem recebe | Título |
|--------|--------|-------------|--------|
| `inbox_anon` | INSERT | `to_profile_id` | Novo recado na caixinha |
| `connections` | INSERT | `to_id` | Nova conexão no CRICRI |
| `posts` | INSERT | quem tem `connections.to_id = author_id` | `@handle` no mural |
| `post_comments` | INSERT | autor do post | Novo comentário |
| `post_likes` | INSERT | autor do post | Curtida no mural |

Spots / afters: use `send-push` manualmente (admin) ou amplie `jobsFromWebhook` em `push-trigger/index.ts`.

### Setup recomendado (Dashboard)

1. Deploy:
   ```bash
   supabase functions deploy send-push
   supabase functions deploy push-trigger --no-verify-jwt
   supabase secrets set VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..." VAPID_SUBJECT="mailto:voce@dominio.com"
   ```
2. **Database → Webhooks → Create**
   - Name: `push-on-inbox`
   - Table: `inbox_anon`
   - Events: **Insert**
   - Destination: Edge Function **`push-trigger`**
   - HTTP Headers: **Add auth header with service role key**
   - Timeout: 5000 ms
3. (Opcional) webhook `push-on-connection` em `connections` / Insert → mesma function.
4. SQL de referência: `supabase/STEP_H_push_triggers.sql` (comentários + alternativa `pg_net`).

### Fluxo

```
INSERT inbox_anon
    → Database Webhook (pg_net)
    → POST /functions/v1/push-trigger
    → lê push_subscriptions (service_role)
    → web-push → browser SW → notificação
```

### Teste com curl

```bash
curl -X POST "https://SEU_REF.supabase.co/functions/v1/push-trigger" \
  -H "Authorization: Bearer SERVICE_ROLE" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"INSERT",
    "table":"inbox_anon",
    "schema":"public",
    "record":{
      "to_profile_id":"UUID-DO-USUARIO-COM-PUSH-ATIVO",
      "body":"teste da caixinha",
      "is_anonymous":true
    },
    "old_record":null
  }'
```

### Segurança

- Webhook no Dashboard já anexa a service role no header.
- `--no-verify-jwt` no `push-trigger` evita 401 quando o caller não é um user JWT; a function ainda precisa dos secrets VAPID e só envia para `user_id` do payload.
- Não exponha a service_role no front. Rate-limit e secret compartilhado (`X-FASC-Hook`) podem ser adicionados depois.

## Segurança do disparo (obrigatório)

As functions **recusam** chamada sem auth de backend:

- `Authorization: Bearer <SERVICE_ROLE_KEY>` **ou**
- header `x-fasc-hook-secret: <FASC_PUSH_HOOK_SECRET>`

No Dashboard Webhook: use **Add auth header with service role key**.

```bash
openssl rand -base64 32   # → FASC_PUSH_HOOK_SECRET
supabase secrets set FASC_PUSH_HOOK_SECRET="..." FASC_CORS_ORIGINS="https://seudominio.com"
```

Detalhes: `docs/SECURITY.md` · SQL: `supabase/STEP_SECURITY_HARDENING.sql`



## Webhook de posts (mural)

Quando alguém publica em `public.posts`, a Edge Function `push-trigger` notifica **quem adicionou o autor** em `connections` (`from_id` onde `to_id = author_id`).

Também trata:

| Tabela | Evento | Quem recebe |
|--------|--------|-------------|
| `posts` | INSERT | conexões do autor (até 40) |
| `post_comments` | INSERT | autor do post |
| `post_likes` | INSERT | autor do post |

### Setup

1. SQL: `supabase/STEP_K_posts_webhooks.sql` (índices + realtime)
2. Deploy:
   ```bash
   supabase functions deploy push-trigger --no-verify-jwt
   ```
3. **Database → Webhooks → Create**
   - Name: `push-on-posts`
   - Table: `posts`
   - Events: **Insert**
   - Edge Function: **`push-trigger`**
   - Auth header: **service role key**
4. (Opcional) webhooks iguais para `post_comments` e `post_likes`.
5. Replication: habilite **`posts`** em `supabase_realtime` (mural ao vivo no front).

### Teste

```bash
curl -X POST "https://SEU_REF.supabase.co/functions/v1/push-trigger" \
  -H "Authorization: Bearer SERVICE_ROLE" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"INSERT",
    "table":"posts",
    "schema":"public",
    "record":{
      "author_id":"UUID-DO-AUTOR",
      "content":"teste mural",
      "place_name":"largo da matriz"
    }
  }'
```

Sem conexões apontando para o autor → `{ "skipped": true }`.  
Com conexões + push ativo → notificação com tag `posts` e URL `/#feed`.

