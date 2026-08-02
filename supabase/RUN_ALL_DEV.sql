-- ========== 202608020001_schema.sql ==========
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


-- ========== 202608020002_rls.sql ==========
-- FASC+ · Etapa 3 — Row Level Security
-- Rode DEPOIS do schema. Sem RLS = anon key lê/escreve tudo.

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_images enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.scraps enable row level security;
alter table public.spots enable row level security;
alter table public.afters enable row level security;
alter table public.after_participants enable row level security;

-- profiles
drop policy if exists "profiles são públicos" on public.profiles;
drop policy if exists "usuário edita o próprio perfil" on public.profiles;
drop policy if exists "usuário cria o próprio perfil" on public.profiles;
create policy "profiles são públicos"
  on public.profiles for select using (true);
create policy "usuário cria o próprio perfil"
  on public.profiles for insert with check (auth.uid() = id);
create policy "usuário edita o próprio perfil"
  on public.profiles for update using (auth.uid() = id);

-- posts
drop policy if exists "posts são públicos" on public.posts;
drop policy if exists "usuário logado cria post" on public.posts;
drop policy if exists "autor apaga o próprio post" on public.posts;
create policy "posts são públicos"
  on public.posts for select using (true);
create policy "usuário logado cria post"
  on public.posts for insert with check (auth.uid() = author_id);
create policy "autor apaga o próprio post"
  on public.posts for delete using (auth.uid() = author_id);

-- post_images
drop policy if exists "imagens públicas" on public.post_images;
drop policy if exists "autor sobe imagens do próprio post" on public.post_images;
create policy "imagens públicas"
  on public.post_images for select using (true);
create policy "autor sobe imagens do próprio post"
  on public.post_images for insert
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

-- likes
drop policy if exists "likes públicos" on public.post_likes;
drop policy if exists "usuário cria o próprio like" on public.post_likes;
drop policy if exists "usuário remove o próprio like" on public.post_likes;
create policy "likes públicos"
  on public.post_likes for select using (true);
create policy "usuário cria o próprio like"
  on public.post_likes for insert with check (auth.uid() = user_id);
create policy "usuário remove o próprio like"
  on public.post_likes for delete using (auth.uid() = user_id);

-- comments
drop policy if exists "comments públicos" on public.post_comments;
drop policy if exists "usuário logado comenta" on public.post_comments;
drop policy if exists "autor apaga o próprio comentário" on public.post_comments;
create policy "comments públicos"
  on public.post_comments for select using (true);
create policy "usuário logado comenta"
  on public.post_comments for insert with check (auth.uid() = author_id);
create policy "autor apaga o próprio comentário"
  on public.post_comments for delete using (auth.uid() = author_id);

-- scraps: só remetente e destinatário
drop policy if exists "scraps visíveis aos envolvidos" on public.scraps;
drop policy if exists "usuário envia scrap" on public.scraps;
drop policy if exists "destinatário marca lido" on public.scraps;
create policy "scraps visíveis aos envolvidos"
  on public.scraps for select
  using (auth.uid() = from_id or auth.uid() = to_id);
create policy "usuário envia scrap"
  on public.scraps for insert
  with check (auth.uid() = from_id);
create policy "destinatário marca lido"
  on public.scraps for update
  using (auth.uid() = to_id);

-- spots: leitura pública; escrita só service_role (sem policy de write = bloqueado pro anon/authenticated)
drop policy if exists "spots são públicos" on public.spots;
create policy "spots são públicos"
  on public.spots for select using (true);

-- afters
drop policy if exists "afters são públicos" on public.afters;
drop policy if exists "usuário logado cria after" on public.afters;
create policy "afters são públicos"
  on public.afters for select using (true);
create policy "usuário logado cria after"
  on public.afters for insert with check (auth.uid() = created_by);

drop policy if exists "participantes públicos" on public.after_participants;
drop policy if exists "usuário confirma presença" on public.after_participants;
drop policy if exists "usuário cancela presença" on public.after_participants;
create policy "participantes públicos"
  on public.after_participants for select using (true);
create policy "usuário confirma presença"
  on public.after_participants for insert with check (auth.uid() = user_id);
create policy "usuário cancela presença"
  on public.after_participants for delete using (auth.uid() = user_id);

-- Auditoria rápida: tabelas public sem RLS (deve retornar 0 linhas)
-- select * from pg_tables where schemaname = 'public' and not rowsecurity;


-- ========== 202608020003_auth_profile_trigger.sql ==========
-- FASC+ · Etapa 4 — profile automático no signup

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'novo usuário'),
    coalesce(new.raw_user_meta_data->>'handle', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ========== 202608020004_storage.sql ==========
-- FASC+ · Etapa 5 — bucket de imagens de post

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists "imagens de post públicas" on storage.objects;
drop policy if exists "usuário sobe suas próprias imagens" on storage.objects;
drop policy if exists "usuário atualiza suas imagens" on storage.objects;
drop policy if exists "usuário apaga suas imagens" on storage.objects;

create policy "imagens de post públicas"
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy "usuário sobe suas próprias imagens"
  on storage.objects for insert
  with check (
    bucket_id = 'post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "usuário atualiza suas imagens"
  on storage.objects for update
  using (
    bucket_id = 'post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "usuário apaga suas imagens"
  on storage.objects for delete
  using (
    bucket_id = 'post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ========== 202608020005_seed_dev.sql ==========
-- FASC+ · Etapa 7 — seed DEV only (NÃO rodar em prod)
-- Nota: profiles precisam de UUIDs em auth.users. Em dev, use o Dashboard
-- para criar usuários de teste OU comente a parte de profiles e use IDs reais.
-- Este seed foca em spots + afters (não dependem de auth) e posts só se houver profiles.

-- SPOTS (São Cristóvão — coords alinhadas ao mock.js)
insert into public.spots (slug, name, lat, lng, radius_m, status) values
  ('convento-sao-francisco', 'Convento São Francisco', -11.0149, -37.2047, 100, 'rolando agora'),
  ('praca-sao-francisco', 'Praça São Francisco', -11.0152, -37.2052, 120, '62% pronto'),
  ('igreja-matriz', 'Igreja Matriz', -11.0138, -37.2068, 90, 'vai rolar às 23h'),
  ('largo-amparo', 'Largo do Amparo', -11.0165, -37.2075, 85, 'terminou'),
  ('casa-do-sabao', 'Rua da Feira', -11.014, -37.208, 95, 'rolando agora')
on conflict (slug) do update set
  status = excluded.status,
  lat = excluded.lat,
  lng = excluded.lng,
  radius_m = excluded.radius_m,
  updated_at = now();

-- AFTERS (próximas 48h a partir de now() do servidor)
insert into public.afters (title, spot_id, category, starts_at)
select v.title, s.id, v.category, now() + v.offset_h * interval '1 hour'
from (values
  ('After no Bar do Zé',        'bar-do-ze',     'música',  6::int),
  ('Roda fechada na Bica',      'roda-bica',     'música',  10),
  ('Projeção no Largo',         'largo-matriz',  'arte',    26),
  ('Quieta no Quintal',         'quintal-ana',   'encontro',30)
) as v(title, slug, category, offset_h)
join public.spots s on s.slug = v.slug
where not exists (
  select 1 from public.afters a where a.title = v.title
);


