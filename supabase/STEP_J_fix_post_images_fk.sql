-- FASC+ · STEP_J — corrige FK post_images quando posts.id é bigint e post_id era uuid
-- Erro típico:
--   foreign key constraint "post_images_post_id_fkey" cannot be implemented
--   Key columns "post_id" and "id" are of incompatible types: uuid and bigint.

-- 1) Diagnóstico (rode separado se quiser ver antes)
-- select table_name, column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name in ('posts', 'post_images', 'post_likes', 'post_comments')
--   and column_name in ('id', 'post_id');

do $$
declare
  posts_id_type text;
begin
  select c.data_type into posts_id_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'posts'
    and c.column_name = 'id';

  if posts_id_type is null then
    raise notice 'Tabela public.posts não existe — crie o schema de posts antes (STEP_B).';
    return;
  end if;

  raise notice 'public.posts.id type = %', posts_id_type;

  -- Remove tabelas dependentes inconsistentes para recriar alinhadas
  drop table if exists public.post_images cascade;
  drop table if exists public.post_likes cascade;
  drop table if exists public.post_comments cascade;

  if posts_id_type in ('bigint', 'integer', 'numeric') then
    -- posts.id numérico
    create table public.post_images (
      id bigint generated always as identity primary key,
      post_id bigint not null references public.posts(id) on delete cascade,
      storage_path text not null,
      position smallint not null default 0 check (position >= 0)
    );

    create table public.post_likes (
      post_id bigint not null references public.posts(id) on delete cascade,
      user_id uuid not null references public.profiles(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (post_id, user_id)
    );

    create table public.post_comments (
      id bigint generated always as identity primary key,
      post_id bigint not null references public.posts(id) on delete cascade,
      author_id uuid not null references public.profiles(id) on delete cascade,
      content text not null check (char_length(content) between 1 and 300),
      created_at timestamptz not null default now()
    );

    raise notice 'Recriado post_images/likes/comments com post_id bigint';

  elsif posts_id_type = 'uuid' then
    create table public.post_images (
      id uuid primary key default gen_random_uuid(),
      post_id uuid not null references public.posts(id) on delete cascade,
      storage_path text not null,
      position smallint not null default 0 check (position >= 0)
    );

    create table public.post_likes (
      post_id uuid not null references public.posts(id) on delete cascade,
      user_id uuid not null references public.profiles(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (post_id, user_id)
    );

    create table public.post_comments (
      id uuid primary key default gen_random_uuid(),
      post_id uuid not null references public.posts(id) on delete cascade,
      author_id uuid not null references public.profiles(id) on delete cascade,
      content text not null check (char_length(content) between 1 and 300),
      created_at timestamptz not null default now()
    );

    raise notice 'Recriado post_images/likes/comments com post_id uuid';

  else
    raise exception 'Tipo de posts.id não suportado: %', posts_id_type;
  end if;

  create index if not exists post_images_post_idx on public.post_images (post_id);
  create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);
  create index if not exists post_likes_user_idx on public.post_likes (user_id);

  -- RLS básico
  alter table public.post_images enable row level security;
  alter table public.post_likes enable row level security;
  alter table public.post_comments enable row level security;

  drop policy if exists "imagens públicas" on public.post_images;
  drop policy if exists "autor sobe imagens do próprio post" on public.post_images;
  create policy "imagens públicas"
    on public.post_images for select using (true);
  create policy "autor sobe imagens do próprio post"
    on public.post_images for insert
    to authenticated
    with check (
      exists (
        select 1 from public.posts p
        where p.id = post_id and p.author_id = auth.uid()
      )
    );

  drop policy if exists "likes públicos" on public.post_likes;
  drop policy if exists "user curte" on public.post_likes;
  drop policy if exists "user remove like" on public.post_likes;
  create policy "likes públicos"
    on public.post_likes for select using (true);
  create policy "user curte"
    on public.post_likes for insert
    to authenticated
    with check (user_id = auth.uid());
  create policy "user remove like"
    on public.post_likes for delete
    to authenticated
    using (user_id = auth.uid());

  drop policy if exists "comentários públicos" on public.post_comments;
  drop policy if exists "user comenta" on public.post_comments;
  create policy "comentários públicos"
    on public.post_comments for select using (true);
  create policy "user comenta"
    on public.post_comments for insert
    to authenticated
    with check (author_id = auth.uid());

  -- limite de imagens por post
  create or replace function public.enforce_post_images_limit()
  returns trigger
  language plpgsql
  as $fn$
  declare n int;
  begin
    select count(*) into n from public.post_images where post_id = new.post_id;
    if n >= 4 then
      raise exception 'Máximo de 4 imagens por post';
    end if;
    return new;
  end;
  $fn$;

  drop trigger if exists trg_post_images_limit on public.post_images;
  create trigger trg_post_images_limit
    before insert on public.post_images
    for each row execute function public.enforce_post_images_limit();

end $$;

select 'STEP_J post_images FK ok' as status;
