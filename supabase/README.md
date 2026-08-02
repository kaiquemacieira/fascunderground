# Supabase — FASC+

## Setup rápido

1. Crie **dois** projetos: `fasc-dev` e `fasc-prod` (região `sa-east-1` se disponível).
2. No **dev**, abra SQL Editor e rode na ordem:

```
migrations/202608020001_schema.sql
migrations/202608020002_rls.sql
migrations/202608020003_auth_profile_trigger.sql
migrations/202608020004_storage.sql
migrations/202608020005_seed_dev.sql
```

3. Auth → Providers → ative **Email** (magic link / OTP).
4. Guarde só no front:

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

Nunca commite `service_role`.

5. Conferir RLS:

```sql
select tablename from pg_tables
where schemaname = 'public' and not rowsecurity;
-- deve retornar 0 linhas
```
