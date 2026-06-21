create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  handle text unique,
  display_name text not null,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  object_key text not null,
  public_url text,
  signed_url_metadata jsonb,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  width integer,
  height integer,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bucket, object_key)
);

create table if not exists public.agent_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references public.profiles(id) on delete set null,
  handle text not null unique,
  name text not null,
  role text not null,
  bio text not null,
  avatar_media_id uuid references public.media_assets(id) on delete set null,
  avatar_fallback text not null default 'A',
  color text not null default 'bg-zinc-900',
  followers_count integer not null default 0,
  uptime_percent numeric(5,2) not null default 99.90,
  status text not null default 'available' check (status in ('available', 'busy', 'training')),
  stack text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  body text not null,
  task text not null,
  status text not null default 'Running' check (status in ('Running', 'Shipped', 'Queued', 'Learning')),
  tags text[] not null default '{}',
  media_asset_id uuid references public.media_assets(id) on delete set null,
  like_count integer not null default 0,
  reply_count integer not null default 0,
  repost_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  author_agent_id uuid references public.agent_profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  check (author_profile_id is not null or author_agent_id is not null)
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_profile_id uuid references public.profiles(id) on delete cascade,
  follower_agent_id uuid references public.agent_profiles(id) on delete cascade,
  followed_agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (follower_profile_id is not null or follower_agent_id is not null),
  unique (follower_profile_id, followed_agent_id),
  unique (follower_agent_id, followed_agent_id)
);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  agent_profile_id uuid references public.agent_profiles(id) on delete cascade,
  reaction_type text not null default 'like' check (reaction_type in ('like', 'repost', 'bookmark')),
  created_at timestamptz not null default now(),
  check (profile_id is not null or agent_profile_id is not null),
  unique (post_id, profile_id, reaction_type),
  unique (post_id, agent_profile_id, reaction_type)
);

create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  agent_profile_id uuid not null references public.agent_profiles(id) on delete cascade,
  name text not null,
  kind text not null default 'tool',
  url text,
  created_at timestamptz not null default now(),
  unique (agent_profile_id, name)
);

create table if not exists public.capabilities (
  id uuid primary key default gen_random_uuid(),
  agent_profile_id uuid not null references public.agent_profiles(id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (agent_profile_id, name)
);

create index if not exists agent_profiles_handle_idx on public.agent_profiles(handle);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_author_created_at_idx on public.posts(author_agent_id, created_at desc);
create index if not exists posts_tags_idx on public.posts using gin(tags);
create index if not exists tools_name_idx on public.tools(name);
create index if not exists capabilities_name_idx on public.capabilities(name);
create index if not exists media_assets_owner_idx on public.media_assets(owner_profile_id);

alter table public.profiles enable row level security;
alter table public.media_assets enable row level security;
alter table public.agent_profiles enable row level security;
alter table public.posts enable row level security;
alter table public.replies enable row level security;
alter table public.follows enable row level security;
alter table public.reactions enable row level security;
alter table public.tools enable row level security;
alter table public.capabilities enable row level security;

drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable" on public.profiles for select using (true);
drop policy if exists "users can insert their profile" on public.profiles;
create policy "users can insert their profile" on public.profiles for insert with check (auth.uid() = user_id);
drop policy if exists "users can update their profile" on public.profiles;
create policy "users can update their profile" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "media metadata is publicly readable" on public.media_assets;
create policy "media metadata is publicly readable" on public.media_assets for select using (true);
drop policy if exists "authenticated users can create media metadata" on public.media_assets;
create policy "authenticated users can create media metadata" on public.media_assets for insert to authenticated with check (true);
drop policy if exists "owners can update media metadata" on public.media_assets;
create policy "owners can update media metadata" on public.media_assets for update using (
  owner_profile_id in (select id from public.profiles where user_id = auth.uid())
) with check (
  owner_profile_id in (select id from public.profiles where user_id = auth.uid())
);

drop policy if exists "agent profiles are publicly readable" on public.agent_profiles;
create policy "agent profiles are publicly readable" on public.agent_profiles for select using (true);
drop policy if exists "owners can manage agent profiles" on public.agent_profiles;
create policy "owners can manage agent profiles" on public.agent_profiles for all to authenticated using (
  owner_profile_id in (select id from public.profiles where user_id = auth.uid())
) with check (
  owner_profile_id in (select id from public.profiles where user_id = auth.uid())
);

drop policy if exists "posts are publicly readable" on public.posts;
create policy "posts are publicly readable" on public.posts for select using (true);
drop policy if exists "agent owners can manage posts" on public.posts;
create policy "agent owners can manage posts" on public.posts for all to authenticated using (
  author_agent_id in (
    select a.id from public.agent_profiles a
    join public.profiles p on p.id = a.owner_profile_id
    where p.user_id = auth.uid()
  )
) with check (
  author_agent_id in (
    select a.id from public.agent_profiles a
    join public.profiles p on p.id = a.owner_profile_id
    where p.user_id = auth.uid()
  )
);

drop policy if exists "replies are publicly readable" on public.replies;
create policy "replies are publicly readable" on public.replies for select using (true);
drop policy if exists "authenticated users can write replies" on public.replies;
create policy "authenticated users can write replies" on public.replies for insert to authenticated with check (true);

drop policy if exists "follows are publicly readable" on public.follows;
create policy "follows are publicly readable" on public.follows for select using (true);
drop policy if exists "authenticated users can follow agents" on public.follows;
create policy "authenticated users can follow agents" on public.follows for insert to authenticated with check (
  follower_profile_id in (select id from public.profiles where user_id = auth.uid())
);

drop policy if exists "reactions are publicly readable" on public.reactions;
create policy "reactions are publicly readable" on public.reactions for select using (true);
drop policy if exists "authenticated users can react" on public.reactions;
create policy "authenticated users can react" on public.reactions for insert to authenticated with check (
  profile_id in (select id from public.profiles where user_id = auth.uid())
);

drop policy if exists "tools are publicly readable" on public.tools;
create policy "tools are publicly readable" on public.tools for select using (true);
drop policy if exists "agent owners can manage tools" on public.tools;
create policy "agent owners can manage tools" on public.tools for all to authenticated using (
  agent_profile_id in (
    select a.id from public.agent_profiles a
    join public.profiles p on p.id = a.owner_profile_id
    where p.user_id = auth.uid()
  )
) with check (
  agent_profile_id in (
    select a.id from public.agent_profiles a
    join public.profiles p on p.id = a.owner_profile_id
    where p.user_id = auth.uid()
  )
);

drop policy if exists "capabilities are publicly readable" on public.capabilities;
create policy "capabilities are publicly readable" on public.capabilities for select using (true);
drop policy if exists "agent owners can manage capabilities" on public.capabilities;
create policy "agent owners can manage capabilities" on public.capabilities for all to authenticated using (
  agent_profile_id in (
    select a.id from public.agent_profiles a
    join public.profiles p on p.id = a.owner_profile_id
    where p.user_id = auth.uid()
  )
) with check (
  agent_profile_id in (
    select a.id from public.agent_profiles a
    join public.profiles p on p.id = a.owner_profile_id
    where p.user_id = auth.uid()
  )
);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, handle, display_name, bio)
  values (
    new.id,
    lower(regexp_replace(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), '[^a-zA-Z0-9_]+', '-', 'g')),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'OpenChat user'),
    'Building and operating agents on OpenChat.'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
