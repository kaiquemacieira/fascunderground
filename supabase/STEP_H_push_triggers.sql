-- FASC+ · STEP_H — gatilhos de push (documentação + opção pg_net)
--
-- Caminho recomendado (sem SQL frágil): Dashboard → Database → Webhooks
--   1) Create a new webhook
--   2) Table: public.inbox_anon · Events: INSERT
--   3) Type: Supabase Edge Functions · Function: push-trigger
--   4) Method POST · timeout 5000
--   5) Headers: Add auth header with service role key
--      (obrigatório — push-trigger retorna 401 sem service_role ou x-fasc-hook-secret)
--   6) (Opcional) segundo webhook em public.connections INSERT → push-trigger
--
-- Deploy antes:
--   supabase functions deploy push-trigger --no-verify-jwt
--   supabase secrets set VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..." VAPID_SUBJECT="mailto:..."
--
-- Abaixo: alternativa 100% SQL com pg_net (se preferir versionar no repo).
-- Substitua PROJECT_REF e a service_role (ideal: Vault, não hardcode).

-- create extension if not exists pg_net with schema extensions;

/*
create or replace function public.fasc_notify_push_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_url text := 'https://bcnbwshwehofncfkdnra.supabase.co';
  -- NÃO commite a service_role. Use vault.decrypted_secrets em prod.
  service_key text := current_setting('app.settings.service_role_key', true);
  payload jsonb;
begin
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(NEW),
    'old_record', case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end
  );

  perform net.http_post(
    url := project_url || '/functions/v1/push-trigger',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(service_key, ''),
      'apikey', coalesce(service_key, '')
    ),
    body := payload,
    timeout_milliseconds := 5000
  );

  return NEW;
end;
$$;

drop trigger if exists trg_inbox_anon_push on public.inbox_anon;
create trigger trg_inbox_anon_push
  after insert on public.inbox_anon
  for each row execute function public.fasc_notify_push_webhook();

drop trigger if exists trg_connections_push on public.connections;
create trigger trg_connections_push
  after insert on public.connections
  for each row execute function public.fasc_notify_push_webhook();
*/

-- Teste manual da Edge Function (SQL Editor não chama HTTP; use curl):
--
-- curl -X POST 'https://bcnbwshwehofncfkdnra.supabase.co/functions/v1/push-trigger' \
--   -H 'Authorization: Bearer SERVICE_ROLE' \
--   -H 'Content-Type: application/json' \
--   -d '{"type":"INSERT","table":"inbox_anon","schema":"public","record":{"to_profile_id":"UUID-DESTINO","body":"teste","is_anonymous":true},"old_record":null}'

select 'STEP_H: configure Database Webhooks no Dashboard (ver comentários acima)' as hint;
