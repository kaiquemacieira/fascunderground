-- FASC+ · PASSO B — resto do schema (depois do PASSO A)
-- profiles + feed + scraps + afters + triggers

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  handle text unique,
  photo_url text,
  bio text,
  city text default 'São Cristóvão',
  created_at timestamptz not null default now()
);

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

create table if not exists public.scraps (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 140),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

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

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_author_idx on public.posts (author_id);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);
create index if not exists post_likes_user_idx on public.post_likes (user_id);
create index if not exists scraps_to_created_idx on public.scraps (to_id, created_at desc);
create index if not exists afters_starts_at_idx on public.afters (starts_at);

create or replace function public.enforce_post_images_limit()
returns trigger language plpgsql as $$
declare n int;
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
