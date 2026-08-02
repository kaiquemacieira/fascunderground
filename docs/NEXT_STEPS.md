# Próximos passos — fasc-dev conectado

**Projeto:** `https://bcnbwshwehofncfkdnra.supabase.co`  
**Front:** `js/config.js` + client + spots com fallback

## 1. Rodar o SQL (obrigatório agora)

No Dashboard Supabase → **SQL Editor** → New query → cole o arquivo inteiro:

`supabase/RUN_ALL_DEV.sql`

Run. Deve criar: profiles, posts, likes, comments, scraps, spots, afters, RLS, storage, seed de 5 spots.

Conferir:

```sql
select slug, name, status from public.spots;
select tablename from pg_tables where schemaname = 'public' and not rowsecurity;
```

Segunda query = **0 linhas**.

## 2. Auth

Authentication → Providers → **Email** ON (magic link / OTP).  
Site URL: a URL onde o app roda (ex. `http://localhost:4173`).

## 3. Realtime (mapa ao vivo)

Database → Replication → habilite a tabela **`spots`** para `supabase_realtime`.

## 4. Testar o front

```bash
npx serve -l 4173 .
```

Console esperado:

- `[FASC+] Supabase client pronto · dev`
- Depois do SQL: `[FASC spots] carregados do Supabase: 5`
- Antes do SQL: `[FASC spots] falha API, fallback local` (app continua funcionando)

## 5. Depois disso (ordem)

1. Tela mínima de login (magic link) usando `window.fascAuth`
2. Feed lendo `posts` do Supabase
3. Scraps → tabela `scraps`
4. Afters list + confirmar presença
5. Só então: `fasc-prod` com as mesmas migrations (sem seed de dev)

## Segurança

- A key `sb_publishable_…` **pode** ficar no front.
- **Nunca** coloque `service_role` no repo ou no browser.
