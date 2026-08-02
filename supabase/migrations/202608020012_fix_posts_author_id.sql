-- CRICRI · ensure posts.author_id (mirror STEP_L)

do $$
declare
  has_posts boolean;
  has_author boolean;
  has_user_id boolean;
  has_profile_id boolean;
  has_content boolean;
  has_body boolean;
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'posts'
  ) into has_posts;

  if not has_posts then
    create table public.posts (
      id uuid primary key default gen_random_uuid(),
      author_id uuid not null references public.profiles(id) on delete cascade,
      content text not null check (char_length(content) between 1 and 500),
      place_name text,
      status text check (status is null or status in ('rolando', 'vai', 'acabou', 'progresso')),
      created_at timestamptz not null default now()
    );
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

  if not has_content and has_body then
    alter table public.posts rename column body to content;
  elsif not has_content then
    alter table public.posts add column content text;
    update public.posts set content = coalesce(content, '') where true;
    begin
      alter table public.posts alter column content set not null;
    exception when others then null;
    end;
  end if;

  if not has_author then
    if has_user_id then
      alter table public.posts rename column user_id to author_id;
    elsif has_profile_id then
      alter table public.posts rename column profile_id to author_id;
    else
      alter table public.posts add column author_id uuid references public.profiles(id) on delete cascade;
    end if;
  end if;

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
exception when others then null;
end $$;
