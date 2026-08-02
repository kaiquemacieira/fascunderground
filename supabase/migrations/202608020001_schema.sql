-- FASC+ · Etapa 2 — schema MVP (Feed + Mapa + Afters)
-- Região alvo: sa-east-1
-- Rode no SQL Editor do projeto fasc-dev primeiro.

create extension if not exists pg_trgm with schema extensions;

-- Perfil público (auth.users é do Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  handle text unique,
  photo_url text,
  bio text,
  city text default 'São Cristóvão',
  created_at timestamptz not null default now()
);

-- Feed
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  place_name text,
  status text check (status is null or status in ('rolando', 'vai', 'acabou', 'progresso')),
  created_at timestamptz not null default now()
);

create table if not exists public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  storage_path text not null,
  position smallint not null default 0 check (position >= 0)
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 300),
  created_at timestamptz not null default now()
);

-- Scraps (substitui mailbox em memória do script.js)
create table if not exists public.scraps (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 140),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Mapa
create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  radius_m integer not null default 90 check (radius_m between 20 and 500),
  status text not null default 'sem info',
  updated_at timestamptz not null default now()
);

-- Afters
create table if not exists public.afters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  spot_id uuid references public.spots(id) on delete set null,
  category text,
  starts_at timestamptz not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.after_participants (
  after_id uuid not null references public.afters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (after_id, user_id)
);

-- Índices
create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_author_idx on public.posts (author_id);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);
create index if not exists post_likes_user_idx on public.post_likes (user_id);
create index if not exists scraps_to_created_idx on public.scraps (to_id, created_at desc);
create index if not exists scraps_from_idx on public.scraps (from_id);
create index if not exists afters_starts_at_idx on public.afters (starts_at);
-- trgm (opcional; se falhar, o btree abaixo basta)
do $$ begin
  create index if not exists spots_name_trgm_idx on public.spots using gin (name gin_trgm_ops);
exception when others then
  create index if not exists spots_name_idx on public.spots (name);
end $$;

-- Limite soft de imagens por post (trigger)
create or replace function public.enforce_post_images_limit()
returns trigger
language plpgsql
as $$
declare
  n int;
begin
  select count(*) into n from public.post_images where post_id = new.post_id;
  if n >= 4 then
    raise exception 'limite de 4 imagens por post';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_post_images_limit on public.post_images;
create trigger trg_post_images_limit
  before insert on public.post_images
  for each row execute function public.enforce_post_images_limit();

-- updated_at em spots
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_spots_updated on public.spots;
create trigger trg_spots_updated
  before update on public.spots
  for each row execute function public.set_updated_at();

-- Grants Data API
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant select on tables to anon, authenticated;
