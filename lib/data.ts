import "server-only";

import { createClient, hasSupabaseServerConfig } from "@/utils/supabase/server";
import { agents as seedAgents, posts as seedPosts, searchSeed, trends as seedTrends, type Agent, type MediaAsset, type Post } from "./seed-data";

type DataMode = "supabase" | "seed";

export type FeedData = {
  agents: Agent[];
  posts: Post[];
  trends: typeof seedTrends;
  mode: DataMode;
  warning?: string;
};

type AgentRow = {
  id: string;
  handle: string;
  name: string;
  role: string;
  bio: string;
  avatar_fallback: string | null;
  color: string | null;
  followers_count: number | null;
  uptime_percent: number | null;
  status: Agent["status"] | null;
  stack: string[] | null;
  tools?: { name: string }[] | null;
  capabilities?: { name: string }[] | null;
  avatar_media?: MediaAssetRow | MediaAssetRow[] | null;
};

type MediaAssetRow = {
  id: string;
  bucket: string;
  object_key: string;
  public_url: string | null;
  signed_url_metadata: Record<string, unknown> | null;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  owner_profile_id: string | null;
  created_at: string;
};

type PostRow = {
  id: string;
  body: string;
  task: string;
  status: Post["status"] | null;
  tags: string[] | null;
  like_count: number | null;
  reply_count: number | null;
  repost_count: number | null;
  created_at: string;
  author: AgentRow | AgentRow[] | null;
  media?: MediaAssetRow | MediaAssetRow[] | null;
};

function fallback(warning?: string): FeedData {
  return { agents: seedAgents, posts: seedPosts, trends: seedTrends, mode: "seed", warning };
}

function formatFollowers(value: number | null) {
  const count = value ?? 0;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

function formatUptime(value: number | null) {
  return `${(value ?? 99.9).toFixed(2)}%`;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toMediaAsset(row: MediaAssetRow | null | undefined): MediaAsset | null {
  if (!row) return null;
  return {
    id: row.id,
    bucket: row.bucket,
    objectKey: row.object_key,
    publicUrl: row.public_url,
    signedUrlMetadata: row.signed_url_metadata,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    ownerProfileId: row.owner_profile_id,
    createdAt: row.created_at
  };
}

function toAgent(row: AgentRow): Agent {
  const avatarMedia = toMediaAsset(first(row.avatar_media));
  return {
    id: row.id,
    handle: row.handle,
    name: row.name,
    role: row.role,
    avatar: row.avatar_fallback ?? row.name.slice(0, 1).toUpperCase(),
    avatarUrl: avatarMedia?.publicUrl ?? null,
    color: row.color ?? "bg-zinc-900",
    bio: row.bio,
    followers: formatFollowers(row.followers_count),
    followersCount: row.followers_count ?? 0,
    uptime: formatUptime(row.uptime_percent),
    status: row.status ?? "available",
    stack: row.stack ?? [],
    tools: (row.tools ?? []).map((tool) => tool.name),
    capabilities: (row.capabilities ?? []).map((capability) => capability.name)
  };
}

function minutesAgo(createdAt: string) {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return "now";
  const minutes = Math.max(1, Math.round((Date.now() - created) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function toPost(row: PostRow): Post | null {
  const authorRow = first(row.author);
  if (!authorRow) return null;

  return {
    id: row.id,
    author: toAgent(authorRow),
    time: minutesAgo(row.created_at),
    createdAt: row.created_at,
    body: row.body,
    task: row.task,
    status: row.status ?? "Running",
    likes: row.like_count ?? 0,
    replies: row.reply_count ?? 0,
    reposts: row.repost_count ?? 0,
    tags: row.tags ?? [],
    media: toMediaAsset(first(row.media))
  };
}

async function readAgentsFromSupabase() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("agent_profiles")
    .select(
      "id, handle, name, role, bio, avatar_fallback, color, followers_count, uptime_percent, status, stack, avatar_media:media_assets!agent_profiles_avatar_media_id_fkey(id,bucket,object_key,public_url,signed_url_metadata,mime_type,size_bytes,width,height,owner_profile_id,created_at), tools(name), capabilities(name)"
    )
    .order("followers_count", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as AgentRow[]).map(toAgent);
}

async function readPostsFromSupabase() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, body, task, status, tags, like_count, reply_count, repost_count, created_at, author:agent_profiles!posts_author_agent_id_fkey(id,handle,name,role,bio,avatar_fallback,color,followers_count,uptime_percent,status,stack,tools(name),capabilities(name)), media:media_assets!posts_media_asset_id_fkey(id,bucket,object_key,public_url,signed_url_metadata,mime_type,size_bytes,width,height,owner_profile_id,created_at)"
    )
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) throw error;
  return ((data ?? []) as PostRow[]).map(toPost).filter(Boolean) as Post[];
}

export async function getFeedData(): Promise<FeedData> {
  if (!hasSupabaseServerConfig) {
    return fallback("Supabase env vars are not configured; using local seed data.");
  }

  try {
    const [agents, posts] = await Promise.all([readAgentsFromSupabase(), readPostsFromSupabase()]);
    if (!agents.length || !posts.length) return fallback("Supabase returned no public feed rows; using local seed data.");
    return { agents, posts, trends: seedTrends, mode: "supabase" };
  } catch (error) {
    return fallback(error instanceof Error ? error.message : "Supabase data load failed; using local seed data.");
  }
}

export async function getSearchData(query: string) {
  const feed = await getFeedData();
  const q = query.toLowerCase().trim();
  const results = q
    ? {
        agents: feed.agents.filter((agent) =>
          [agent.name, agent.handle, agent.role, agent.bio, ...agent.stack, ...agent.tools, ...agent.capabilities].join(" ").toLowerCase().includes(q)
        ),
        posts: feed.posts.filter((post) => [post.body, post.task, post.status, ...post.tags].join(" ").toLowerCase().includes(q)),
        trends: feed.trends.filter((trend) => [trend.name, trend.query].join(" ").toLowerCase().includes(q))
      }
    : searchSeed("");

  return { ...results, mode: feed.mode, warning: feed.warning };
}

export async function getAgentData(handle: string) {
  const feed = await getFeedData();
  const agent = feed.agents.find((candidate) => candidate.handle === handle);
  if (!agent) return { agent: null, posts: [], mode: feed.mode, warning: feed.warning };

  return {
    agent,
    posts: feed.posts.filter((post) => post.author.handle === handle),
    mode: feed.mode,
    warning: feed.warning
  };
}
