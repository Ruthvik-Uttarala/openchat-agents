alter table public.agent_profiles
  add column if not exists status_note text,
  add column if not exists header_media_id uuid references public.media_assets(id) on delete set null;

alter table public.posts
  add column if not exists canonical_path text,
  add column if not exists content jsonb not null default '{"sections":[]}'::jsonb;

create index if not exists agent_profiles_header_media_idx on public.agent_profiles(header_media_id);
create index if not exists agent_profiles_stack_idx on public.agent_profiles using gin(stack);
create index if not exists posts_canonical_path_idx on public.posts(canonical_path);
create index if not exists posts_content_gin_idx on public.posts using gin(content);
create index if not exists posts_tags_idx on public.posts using gin(tags);

update public.posts p
set canonical_path = '/agent/' || a.handle || '#post-' || p.id::text
from public.agent_profiles a
where a.id = p.author_agent_id
  and (p.canonical_path is null or p.canonical_path = '');

update public.posts
set content = jsonb_build_object(
  'sections',
  jsonb_build_array(
    jsonb_build_object(
      'type', 'markdown',
      'text', body
    )
  )
)
where content is null
   or jsonb_typeof(content) <> 'object'
   or not (content ? 'sections');

grant delete on public.profiles, public.media_assets, public.agent_profiles, public.posts, public.replies, public.follows, public.reactions, public.tools, public.capabilities to authenticated;

drop policy if exists "agent owners can create posts" on public.posts;
create policy "agent owners can create posts" on public.posts for insert to authenticated with check (
  author_agent_id in (
    select a.id
    from public.agent_profiles a
    join public.profiles p on p.id = a.owner_profile_id
    where p.user_id = (select auth.uid())
  )
);

drop policy if exists "owners can delete their posts" on public.posts;
create policy "owners can delete their posts" on public.posts for delete to authenticated using (
  author_agent_id in (
    select a.id
    from public.agent_profiles a
    join public.profiles p on p.id = a.owner_profile_id
    where p.user_id = (select auth.uid())
  )
);

drop policy if exists "authenticated users can unfollow agents" on public.follows;
create policy "authenticated users can unfollow agents" on public.follows for delete to authenticated using (
  follower_profile_id in (select id from public.profiles where user_id = (select auth.uid()))
  or follower_agent_id in (
    select a.id
    from public.agent_profiles a
    join public.profiles p on p.id = a.owner_profile_id
    where p.user_id = (select auth.uid())
  )
);

drop policy if exists "authenticated users can remove reactions" on public.reactions;
create policy "authenticated users can remove reactions" on public.reactions for delete to authenticated using (
  profile_id in (select id from public.profiles where user_id = (select auth.uid()))
  or agent_profile_id in (
    select a.id
    from public.agent_profiles a
    join public.profiles p on p.id = a.owner_profile_id
    where p.user_id = (select auth.uid())
  )
);

drop policy if exists "agent owners can create tools" on public.tools;
create policy "agent owners can create tools" on public.tools for insert to authenticated with check (
  agent_profile_id in (
    select a.id
    from public.agent_profiles a
    join public.profiles p on p.id = a.owner_profile_id
    where p.user_id = (select auth.uid())
  )
);

drop policy if exists "agent owners can delete tools" on public.tools;
create policy "agent owners can delete tools" on public.tools for delete to authenticated using (
  agent_profile_id in (
    select a.id
    from public.agent_profiles a
    join public.profiles p on p.id = a.owner_profile_id
    where p.user_id = (select auth.uid())
  )
);

drop policy if exists "agent owners can create capabilities" on public.capabilities;
create policy "agent owners can create capabilities" on public.capabilities for insert to authenticated with check (
  agent_profile_id in (
    select a.id
    from public.agent_profiles a
    join public.profiles p on p.id = a.owner_profile_id
    where p.user_id = (select auth.uid())
  )
);

drop policy if exists "agent owners can delete capabilities" on public.capabilities;
create policy "agent owners can delete capabilities" on public.capabilities for delete to authenticated using (
  agent_profile_id in (
    select a.id
    from public.agent_profiles a
    join public.profiles p on p.id = a.owner_profile_id
    where p.user_id = (select auth.uid())
  )
);

create or replace function private.refresh_post_counters(target_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set like_count = (
        select count(*)
        from public.reactions
        where post_id = target_post_id
          and reaction_type = 'like'
      ),
      repost_count = (
        select count(*)
        from public.reactions
        where post_id = target_post_id
          and reaction_type = 'repost'
      ),
      reply_count = (
        select count(*)
        from public.replies
        where post_id = target_post_id
      ),
      updated_at = now()
  where id = target_post_id;
end;
$$;

create or replace function private.refresh_followers_count(target_agent_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.agent_profiles
  set followers_count = (
    select count(*)
    from public.follows
    where followed_agent_id = target_agent_id
  ),
  updated_at = now()
  where id = target_agent_id;
end;
$$;

create or replace function private.on_reaction_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.refresh_post_counters(coalesce(new.post_id, old.post_id));
  return coalesce(new, old);
end;
$$;

create or replace function private.on_reply_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.refresh_post_counters(coalesce(new.post_id, old.post_id));
  return coalesce(new, old);
end;
$$;

create or replace function private.on_follow_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.refresh_followers_count(coalesce(new.followed_agent_id, old.followed_agent_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists on_reaction_change on public.reactions;
create trigger on_reaction_change
  after insert or delete or update of reaction_type, post_id on public.reactions
  for each row execute function private.on_reaction_change();

drop trigger if exists on_reply_change on public.replies;
create trigger on_reply_change
  after insert or delete or update of post_id on public.replies
  for each row execute function private.on_reply_change();

drop trigger if exists on_follow_change on public.follows;
create trigger on_follow_change
  after insert or delete or update of followed_agent_id on public.follows
  for each row execute function private.on_follow_change();

create or replace function public.search_public_content(search_query text, max_agents integer default 12, max_posts integer default 20)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with query as (
  select websearch_to_tsquery('english', coalesce(nullif(trim(search_query), ''), 'openchat')) as q
),
agent_documents as (
  select
    a.id,
    to_tsvector(
      'english',
      concat_ws(
        ' ',
        a.handle,
        a.name,
        a.role,
        a.bio,
        coalesce(a.status_note, ''),
        coalesce(array_to_string(a.stack, ' '), ''),
        coalesce(string_agg(distinct t.name, ' '), ''),
        coalesce(string_agg(distinct c.name, ' '), '')
      )
    ) as document
  from public.agent_profiles a
  left join public.tools t on t.agent_profile_id = a.id
  left join public.capabilities c on c.agent_profile_id = a.id
  group by a.id, a.handle, a.name, a.role, a.bio, a.status_note, a.stack
),
post_documents as (
  select
    p.id,
    to_tsvector(
      'english',
      concat_ws(
        ' ',
        p.body,
        p.task,
        p.status,
        coalesce(array_to_string(p.tags, ' '), ''),
        coalesce(p.content::text, ''),
        a.handle,
        a.name,
        a.role
      )
    ) as document
  from public.posts p
  join public.agent_profiles a on a.id = p.author_agent_id
),
matching_agents as (
  select id, ts_rank_cd(document, query.q) as rank
  from agent_documents, query
  where document @@ query.q
  order by rank desc, id
  limit greatest(1, least(coalesce(max_agents, 12), 30))
),
matching_posts as (
  select id, ts_rank_cd(document, query.q) as rank
  from post_documents, query
  where document @@ query.q
  order by rank desc, id
  limit greatest(1, least(coalesce(max_posts, 20), 50))
),
matching_trends as (
  select
    tag as name,
    count(*)::int as total
  from public.posts p
  cross join lateral unnest(p.tags) as tag
  where tag ilike '%' || trim(search_query) || '%'
  group by tag
  order by total desc, tag
  limit 8
)
select jsonb_build_object(
  'agents',
  coalesce((select jsonb_agg(id order by rank desc, id) from matching_agents), '[]'::jsonb),
  'posts',
  coalesce((select jsonb_agg(id order by rank desc, id) from matching_posts), '[]'::jsonb),
  'trends',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'name', name,
          'count', total::text,
          'query', name
        )
        order by total desc, name
      )
      from matching_trends
    ),
    '[]'::jsonb
  )
);
$$;

grant execute on function public.search_public_content(text, integer, integer) to anon, authenticated;
