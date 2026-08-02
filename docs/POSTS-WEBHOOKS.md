# CRICRI — Webhooks de posts (mural)

## O que faz

| Evento | Ação |
|--------|------|
| `INSERT` em `posts` | Push para quem tem o autor em **conexões** + front realtime atualiza o mural |
| `INSERT` em `post_comments` | Push para o **autor do post** |
| `INSERT` em `post_likes` | Push para o **autor do post** |

Arquivos:

- `supabase/functions/push-trigger/index.ts` — handler
- `supabase/STEP_K_posts_webhooks.sql` — índices + realtime
- `supabase/migrations/202608020011_posts_webhooks.sql` — migration

## Pré-requisitos

1. Tabelas `posts`, `connections`, `push_subscriptions` criadas e com RLS.
2. VAPID + secrets na Edge Function (veja `docs/PUSH.md`).
3. Usuário destinatário com **Ativar notificações** no perfil.

## Passo a passo

### 1. SQL

No SQL Editor:

```text
supabase/STEP_K_posts_webhooks.sql
```

### 2. Deploy

```bash
supabase functions deploy push-trigger --no-verify-jwt
```

### 3. Webhook no Dashboard

**Database → Webhooks → Create**

| Campo | Valor |
|-------|--------|
| Name | `push-on-posts` |
| Table | `posts` |
| Events | Insert |
| Destination | Edge Function `push-trigger` |
| Headers | Auth com **service role** |
| Timeout | 5000 ms |

Opcional: repita para `post_comments` e `post_likes`.

### 4. Realtime (mural vivo)

**Database → Replication** → habilite `posts`.

O front (`index.html`) escuta `postgres_changes` em `posts` e recarrega o feed.

## Regras de produto

- **Não** envia push para o próprio autor.
- Destinatários de post novo = linhas em `connections` com `to_id = author_id` (quem **adicionou** o autor).
- Limite: 40 destinatários por post (anti-spam na function).
- Sem conexões → webhook responde `skipped` (HTTP 200), sem erro.

## Segurança

- Function exige `Authorization: Bearer <service_role>` ou `x-fasc-hook-secret`.
- Nunca chame com a **anon key**.
- Payload de notificação: só path relativo (`/#feed`).

## Debug

| Sintoma | Causa |
|---------|--------|
| `skipped` | Autor sem quem o adicionou em connections |
| `sent: 0` | Destinatário sem `push_subscriptions` |
| 401 | Header de auth do webhook ausente |
| Mural não atualiza | Realtime de `posts` desligado |
