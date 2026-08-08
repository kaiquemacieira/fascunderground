-- CRICRI · Rate limit real — MEOW (inbox_anon) + scraps
-- Obrigatório antes do festival (anti assédio em massa / flood).
--
-- Rode no SQL Editor do Supabase (prod e dev).
-- Limites (janela deslizante de 1 hora):
--   MEOW  · 10 envios/hora no total  ·  3 para o mesmo perfil
--   SCRAP · 20 envios/hora no total  ·  8 para o mesmo destinatário
--
-- Contagem por auth.uid() via tabela dedicada (funciona mesmo com
-- from_profile_id null em recados “totalmente anônimos”).

create table if not exists public.rate_limit_events (
  id          bigserial primary key,
  user_id     uuid not null,
  channel     text not null check (channel in ('meow', 'scrap')),
  target_id   uuid,
  created_at  timestamptz not null default now()
);

create index if not exists rate_limit_events_user_ch_created_idx
  on public.rate_limit_events (user_id, channel, created_at desc);

create index if not exists rate_limit_events_user_ch_target_created_idx
  on public.rate_limit_events (user_id, channel, target_id, created_at desc);

create index if not exists rate_limit_events_created_idx
  on public.rate_limit_events (created_at);

alter table public.rate_limit_events enable row level security;
alter table public.rate_limit_events force row level security;

revoke all on table public.rate_limit_events from anon, authenticated, public;

create or replace function public.enforce_send_rate_limit(
  p_channel  text,
  p_target   uuid,
  p_max_hour int,
  p_max_same int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n_hour int;
  n_same int;
  window_start timestamptz := now() - interval '1 hour';
begin
  if uid is null then
    raise exception 'RATE_LIMIT: autenticação obrigatória'
      using errcode = '42501';
  end if;

  if p_channel is null or p_channel not in ('meow', 'scrap') then
    raise exception 'RATE_LIMIT: canal inválido'
      using errcode = '22023';
  end if;

  select count(*)::int into n_hour
  from public.rate_limit_events
  where user_id = uid
    and channel = p_channel
    and created_at >= window_start;

  if n_hour >= p_max_hour then
    raise exception
      'RATE_LIMIT: limite de % envios/hora neste canal. Tente mais tarde.',
      p_max_hour
      using errcode = 'P0001';
  end if;

  if p_target is not null and p_max_same is not null and p_max_same > 0 then
    select count(*)::int into n_same
    from public.rate_limit_events
    where user_id = uid
      and channel = p_channel
      and target_id = p_target
      and created_at >= window_start;

    if n_same >= p_max_same then
      raise exception
        'RATE_LIMIT: limite de % envios/hora para esta pessoa. Tente mais tarde.',
        p_max_same
        using errcode = 'P0001';
    end if;
  end if;

  insert into public.rate_limit_events (user_id, channel, target_id)
  values (uid, p_channel, p_target);
end;
$$;

revoke all on function public.enforce_send_rate_limit(text, uuid, int, int) from public;
grant execute on function public.enforce_send_rate_limit(text, uuid, int, int) to authenticated;

create or replace function public.trg_inbox_anon_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_send_rate_limit('meow', NEW.to_profile_id, 10, 3);
  return NEW;
end;
$$;

drop trigger if exists inbox_anon_rate_limit_bi on public.inbox_anon;
create trigger inbox_anon_rate_limit_bi
  before insert on public.inbox_anon
  for each row
  execute function public.trg_inbox_anon_rate_limit();

create or replace function public.trg_scraps_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_send_rate_limit('scrap', NEW.to_id, 20, 8);
  return NEW;
end;
$$;

drop trigger if exists scraps_rate_limit_bi on public.scraps;
create trigger scraps_rate_limit_bi
  before insert on public.scraps
  for each row
  execute function public.trg_scraps_rate_limit();

create or replace function public.cleanup_rate_limit_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  delete from public.rate_limit_events
  where created_at < now() - interval '7 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.cleanup_rate_limit_events() from public;

comment on table public.rate_limit_events is
  'Log de envios MEOW/scrap para rate limit por auth.uid()/hora. Sem acesso direto do client.';
comment on function public.enforce_send_rate_limit is
  'Rejeita insert se exceder teto/hora (global e por destino).';
