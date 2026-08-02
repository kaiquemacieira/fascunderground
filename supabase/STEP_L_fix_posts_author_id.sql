-- CRICRI · STEP_L — corrige posts sem coluna author_id
-- Erro típico: ERROR: 42703: column "author_id" does not exist
--
-- Rode no SQL Editor do projeto (fasc-dev / fasc-prod).

-- 0) Diagnóstico (opcional — descomente para ver)
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'posts'
-- order by ordinal_position;

do $$
declare
  has_posts boolean;
  has_author boolean;
  has_user_id boolean;
  has_profile_id boolean;
  has_content boolean;
  has_body boolean;
  col record;
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'posts'
  ) into has_posts;

  if not has_posts then
    -- cria schema mínimo alinhado ao app
    create table public.posts (
      id uuid primary key default gen_random_uuid(),
      author_id uuid not null references public.profiles(id) on delete cascade,
      content text not null check (char_length(content) between 1 and 500),
      place_name text,
      status text check (status is null or status in ('rolando', 'vai', 'acabou', 'progresso')),
      created_at timestamptz not null default now()
    );
    raise notice 'Criada public.posts com author_id';
    return;
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'author_id'
  ) into has_author;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'user_id'
  ) into has_user_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'profile_id'
  ) into has_profile_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'content'
  ) into has_content;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'body'
  ) into has_body;

  -- 1) Garantir content
  if not has_content and has_body then
    alter table public.posts rename column body to content;
    raise notice 'Renomeado body → content';
  elsif not has_content then
    alter table public.posts add column content text;
    update public.posts set content = coalesce(content, '') where content is null;
    alter table public.posts alter column content set not null;
    raise notice 'Adicionada coluna content';
  end if;

  -- 2) Garantir author_id
  if has_author then
    raise notice 'author_id já existe — ok';
  elsif has_user_id then
    alter table public.posts rename column user_id to author_id;
    raise notice 'Renomeado user_id → author_id';
  elsif has_profile_id then
    alter table public.posts rename column profile_id to author_id;
    raise notice 'Renomeado profile_id → author_id';
  else
    -- adiciona coluna (pode falhar se houver linhas sem autor — preenche depois)
    alter table public.posts add column author_id uuid references public.profiles(id) on delete cascade;
    raise notice 'Adicionada coluna author_id (nullable até popular)';

    -- se só houver 1 profile, associa
    if (select count(*) from public.profiles) = 1 then
      update public.posts
      set author_id = (select id from public.profiles limit 1)
      where author_id is null;
    end if;
  end if;

  -- 3) Colunas extras do app
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'place_name'
  ) then
    alter table public.posts add column place_name text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'status'
  ) then
    alter table public.posts add column status text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'created_at'
  ) then
    alter table public.posts add column created_at timestamptz not null default now();
  end if;

end $$;

-- 4) FK author_id → profiles (se ainda não houver)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'posts'
      and constraint_type = 'FOREIGN KEY'
      and constraint_name like '%author%'
  ) then
    begin
      alter table public.posts
        add constraint posts_author_id_fkey
        foreign key (author_id) references public.profiles(id) on delete cascade;
    exception when others then
      raise notice 'FK author_id: %', SQLERRM;
    end;
  end if;
end $$;

-- 5) Índices (só se a coluna existir)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'author_id'
  ) then
    create index if not exists posts_author_idx on public.posts (author_id);
    create index if not exists posts_author_created_idx on public.posts (author_id, created_at desc);
  end if;
  create index if not exists posts_created_idx on public.posts (created_at desc);
end $$;

-- 6) RLS básico
alter table public.posts enable row level security;

drop policy if exists "posts são públicos" on public.posts;
drop policy if exists "posts public read" on public.posts;
create policy "posts são públicos"
  on public.posts for select using (true);

drop policy if exists "autor cria post" on public.posts;
drop policy if exists "user cria post" on public.posts;
create policy "autor cria post"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "autor apaga post" on public.posts;
create policy "autor apaga post"
  on public.posts for delete
  to authenticated
  using (auth.uid() = author_id);

grant select on public.posts to anon, authenticated;
grant insert, delete on public.posts to authenticated;

-- 7) Resultado
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'posts'
order by ordinal_position;

select 'STEP_L posts.author_id ok' as status;
