# Erro: column "author_id" does not exist

A tabela `public.posts` no seu projeto Supabase foi criada **sem** a coluna `author_id` (ou com outro nome: `user_id` / `profile_id`).

## Correção (1 minuto)

No **SQL Editor** do Supabase, rode o arquivo inteiro:

```text
supabase/STEP_L_fix_posts_author_id.sql
```

Ele:
1. Detecta se existe `user_id` / `profile_id` e renomeia para `author_id`
2. Ou adiciona `author_id` se faltar
3. Garante `content`, `place_name`, `status`, `created_at`
4. Recria índices e policies RLS

Depois, se quiser webhooks:

```text
supabase/STEP_K_posts_webhooks.sql
```

## Conferir

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'posts'
order by ordinal_position;
```

Deve aparecer `author_id` (uuid).
