-- FASC+ · STEP_G — Web Push subscriptions
-- Rode no SQL Editor do fasc-dev (e depois em fasc-prod).

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id, created_at desc);

create or replace function public.set_push_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_push_subscriptions_updated on public.push_subscriptions;
create trigger trg_push_subscriptions_updated
  before update on public.push_subscriptions
  for each row execute function public.set_push_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "push: dono lê" on public.push_subscriptions;
drop policy if exists "push: dono cria" on public.push_subscriptions;
drop policy if exists "push: dono atualiza" on public.push_subscriptions;
drop policy if exists "push: dono apaga" on public.push_subscriptions;

create policy "push: dono lê"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "push: dono cria"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "push: dono atualiza"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "push: dono apaga"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;

comment on table public.push_subscriptions is
  'FASC+: endpoints Web Push por usuário. Envio só via backend (service_role / Edge Function).';
