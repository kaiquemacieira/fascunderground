# FASC+ — Segurança (backend)

Princípio: **menor privilégio**, **RLS em tudo que é público na API**, **service_role nunca no client**, **Edge Functions autenticadas**.

## Checklist obrigatório (prod)

- [ ] `service_role` **não** está em nenhum HTML/JS/repo público
- [ ] VAPID **private** só em `supabase secrets`
- [ ] `FASC_PUSH_HOOK_SECRET` definido (32+ bytes aleatórios)
- [ ] `STEP_SECURITY_HARDENING.sql` rodado em **fasc-prod**
- [ ] Database Webhooks com **auth header = service role**
- [ ] Edge Functions `send-push` e `push-trigger` **não** são chamadas com anon key
- [ ] Site URL / Redirect URLs de Auth limitados ao domínio real
- [ ] RLS audit: `select tablename from pg_tables where schemaname='public' and not rowsecurity` → 0 linhas
- [ ] CORS: `FASC_CORS_ORIGINS=https://seudominio.com` (csv)

## Superfície de ataque e mitigação

| Superfície | Risco | Mitigação no FASC+ |
|------------|-------|---------------------|
| Anon key no front | Leitura/escrita indevida | RLS + grants estreitos; key é **publishable** |
| Edge Function pública | Spam de push / abuso | `assertBackendAuth` (service_role ou hook secret) |
| Webhook URL adivinhável | Disparo de push | Mesma auth; payload limitado; tabelas allowlist |
| `push_subscriptions` | Roubo de endpoints | RLS `auth.uid() = user_id`; revoke anon |
| `inbox_anon` | Spoof de remetente | `from_profile_id` só null ou = auth.uid() |
| `spots` write | Defacement do mapa | Sem policy de write; revoke insert/update/delete |
| Notificação `url` | Open redirect / XSS | Só paths relativos (`safeUrlPath`) |
| Body grande | DoS na function | `readJsonLimited` (32–64 KB) |
| Erros verbosos | Info leak | Respostas genéricas; detalhe só em `console.error` |

## Secrets

```bash
# Gere um hook secret forte
openssl rand -base64 32

supabase secrets set \
  VAPID_PUBLIC_KEY="..." \
  VAPID_PRIVATE_KEY="..." \
  VAPID_SUBJECT="mailto:sec@seudominio.com" \
  FASC_PUSH_HOOK_SECRET="..." \
  FASC_CORS_ORIGINS="https://seudominio.com,http://localhost:4173"
```

## Auth das Edge Functions

Aceito **apenas**:

1. `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`, ou
2. `x-fasc-hook-secret: <FASC_PUSH_HOOK_SECRET>`

Comparação com **timing-safe equal**.  
Resposta `401 unauthorized` sem detalhar qual fator falhou.

Deploy sugerido **com** verificação de JWT no gateway **e** auth interna (defense in depth). Webhooks do Dashboard devem mandar service role no header.

## RLS — regras de ouro

1. `enable row level security` + preferir `force row level security` em tabelas sensíveis  
2. Policies com `to authenticated` / `to anon` explícitos  
3. Nunca confiar só em `grant` — grant sem RLS = buraco  
4. `security definer` só com `set search_path` fixo (já no trigger de profile)

## O que o front pode fazer

- Usar **anon/publishable** key  
- Upsert da **própria** linha em `push_subscriptions`  
- Enviar recado autenticado (RLS)

## O que o front **nunca** pode fazer

- Enviar push (chamar `send-push` / `push-trigger`)  
- Ler subscriptions de outros  
- Escrever `spots`  
- Ver `from_profile_id` de recados anônimos de terceiros (dono vê a linha, mas app não precisa exibir o id se `is_anonymous`)

## Rate limit (próximo nível)

Para o festival, considere:

- Edge middleware / Upstash Redis contando por `user_id` destino  
- Trigger que rejeita > N inserts/`inbox_anon` por `auth.uid()` / hora  
- Cap de 10 subscriptions por usuário (já há `.limit(10)` no envio)

## Incidentes

1. Rodar rotação da **service_role** (Dashboard) se vazou  
2. Rotacionar VAPID (usuários precisam reativar notificações)  
3. `delete from push_subscriptions` se endpoints comprometidos  
4. Revisar logs de Functions → Invocations

## Arquivos

| Arquivo | Função |
|---------|--------|
| `supabase/functions/_shared/security.ts` | Auth, CORS, limites, sanitização |
| `supabase/functions/send-push` | Envio autenticado |
| `supabase/functions/push-trigger` | Webhook → push autenticado |
| `supabase/STEP_SECURITY_HARDENING.sql` | Grants + RLS reforçado |
| `docs/PUSH.md` | Operação de push |
