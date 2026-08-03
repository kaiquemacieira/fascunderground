-- CRICRI · reações rápidas no bichinho de amigos (P0.4)
-- Emojis fixos: 🔥 😍 🥹 👑

create table if not exists public.pet_reactions (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint pet_reactions_emoji_check
    check (emoji in ('🔥', '😍', '🥹', '👑')),
  constraint pet_reactions_not_self
    check (from_user <> to_user)
);

create index if not exists pet_reactions_to_user_idx
  on public.pet_reactions (to_user, created_at desc);

create index if not exists pet_reactions_from_user_idx
  on public.pet_reactions (from_user, created_at desc);

create index if not exists pet_reactions_to_emoji_idx
  on public.pet_reactions (to_user, emoji);

alter table public.pet_reactions enable row level security;

-- autenticado: inserir reação para OUTRO usuário (from_user = eu)
drop policy if exists pet_reactions_insert_auth on public.pet_reactions;
create policy pet_reactions_insert_auth
  on public.pet_reactions for insert
  to authenticated
  with check (
    auth.uid() = from_user
    and auth.uid() <> to_user
  );

-- ler reações que EU recebi
drop policy if exists pet_reactions_select_received on public.pet_reactions;
create policy pet_reactions_select_received
  on public.pet_reactions for select
  to authenticated
  using (auth.uid() = to_user);

-- ler reações que EU enviei
drop policy if exists pet_reactions_select_sent on public.pet_reactions;
create policy pet_reactions_select_sent
  on public.pet_reactions for select
  to authenticated
  using (auth.uid() = from_user);

-- sem UPDATE/DELETE público nesta fase (dono não apaga em massa pelo client)

grant select, insert on table public.pet_reactions to authenticated;
-- anon: sem grant (só autenticado reage)

-- contagem pública por destinatário (só totais por emoji — sem expor from_user)
create or replace function public.get_pet_reaction_counts(p_to_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_object_agg(emoji, cnt),
    '{}'::jsonb
  )
  from (
    select emoji, count(*)::int as cnt
    from public.pet_reactions
    where to_user = p_to_user
    group by emoji
  ) s;
$$;

revoke all on function public.get_pet_reaction_counts(uuid) from public;
grant execute on function public.get_pet_reaction_counts(uuid) to anon, authenticated;

comment on table public.pet_reactions is
  'CRICRI: reações rápidas (🔥😍🥹👑) de um usuário no bichinho de outro.';
comment on function public.get_pet_reaction_counts(uuid) is
  'CRICRI: contagens públicas por emoji para to_user (sem revelar quem reagiu).';
