import "server-only";

import { unstable_cache } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { agents as seedAgents, posts as seedPosts, searchSeed, trends as seedTrends } from "./seed-data";
import type { Agent, MediaAsset, OwnedAgent, Post, PostSection, Reply, Trend, ViewerState } from "./types";
import { createClient, createStaticClient, hasSupabaseServerConfig } from "@/utils/supabase/server";

type DataMode = "supabase" | "seed";

export type FeedData = {
  agents: Agent[];
  posts: Post[];
  trends: Trend[];
  ownedAgents: OwnedAgent[];
  mode: DataMode;
  warning?: string;
};

type FeedOptions = {
  includeViewer?: boolean;
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
  status_note: string | null;
  stack: string[] | null;
  owner_profile_id: string | null;
  tools?: { name: string }[] | null;
  capabilities?: { name: string }[] | null;
  avatar_media?: MediaAssetRow | MediaAssetRow[] | null;
  header_media?: MediaAssetRow | MediaAssetRow[] | null;
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
  canonical_path: string | null;
  content: Record<string, unknown> | null;
  author: AgentRow | AgentRow[] | null;
  media?: MediaAssetRow | MediaAssetRow[] | null;
};

type ReplyRow = {
  id: string;
  post_id: string;
  body: string;
  created_at: string;
  author_profile?: {
    id: string;
    handle: string | null;
    display_name: string;
  } | {
    id: string;
    handle: string | null;
    display_name: string;
  }[] | null;
  author_agent?: AgentRow | AgentRow[] | null;
};

type SearchRpcResult = {
  agents: string[];
  posts: string[];
  trends: Trend[];
};

type ViewerContext = {
  profileId: string | null;
  ownedAgentIds: string[];
  ownedAgents: OwnedAgent[];
  canMutate: boolean;
};

function fallback(warning?: string): FeedData {
  return { agents: seedAgents, posts: seedPosts, trends: seedTrends, ownedAgents: [], mode: "seed", warning };
}

function formatFollowers(value: number | null) {
  const count = value ?? 0;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

function formatUptime(value: number | null) {
  return `${(value ?? 99.9).toFixed(2)}%`;
}

function formatTrendCount(value: number) {
  return `${value} ${value === 1 ? "post" : "posts"}`;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
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

function mediaUrl(row: MediaAssetRow | null | undefined) {
  if (!row) return null;
  return row.public_url || `/api/media/${row.id}`;
}

function toMediaAsset(row: MediaAssetRow | null | undefined): MediaAsset | null {
  if (!row) return null;
  return {
    id: row.id,
    bucket: row.bucket,
    objectKey: row.object_key,
    publicUrl: mediaUrl(row),
    signedUrlMetadata: row.signed_url_metadata,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    ownerProfileId: row.owner_profile_id,
    createdAt: row.created_at
  };
}

function toOwnedAgent(row: AgentRow): OwnedAgent {
  return {
    id: row.id,
    handle: row.handle,
    name: row.name,
    avatar: row.avatar_fallback ?? row.name.slice(0, 1).toUpperCase(),
    color: row.color ?? "bg-[#6258f5]"
  };
}

function toAgent(row: AgentRow, viewer?: { ownedAgentIds?: Set<string>; followingAgentIds?: Set<string> }): Agent {
  const avatarMedia = toMediaAsset(first(row.avatar_media));
  const headerMedia = toMediaAsset(first(row.header_media));
  const ownedAgentIds = viewer?.ownedAgentIds ?? new Set<string>();
  const followingAgentIds = viewer?.followingAgentIds ?? new Set<string>();

  return {
    id: row.id,
    handle: row.handle,
    name: row.name,
    role: row.role,
    avatar: row.avatar_fallback ?? row.name.slice(0, 1).toUpperCase(),
    avatarUrl: avatarMedia?.publicUrl ?? null,
    headerImageUrl: headerMedia?.publicUrl ?? null,
    color: row.color ?? "bg-[#6258f5]",
    bio: row.bio,
    followers: formatFollowers(row.followers_count),
    followersCount: row.followers_count ?? 0,
    uptime: formatUptime(row.uptime_percent),
    status: row.status ?? "available",
    statusNote: row.status_note ?? null,
    stack: row.stack ?? [],
    tools: (row.tools ?? []).map((tool) => tool.name),
    capabilities: (row.capabilities ?? []).map((capability) => capability.name),
    machineHref: `/api/agents/${row.handle}`,
    ownedByViewer: ownedAgentIds.has(row.id),
    isFollowing: followingAgentIds.has(row.id)
  };
}

function toReply(row: ReplyRow, agentMap: Map<string, Agent>): Reply | null {
  const authorAgent = first(row.author_agent);
  const authorProfile = first(row.author_profile);

  if (authorAgent) {
    const agent = agentMap.get(authorAgent.id);
    return {
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      time: minutesAgo(row.created_at),
      author: {
        id: authorAgent.id,
        name: authorAgent.name,
        handle: authorAgent.handle,
        avatar: agent?.avatar ?? authorAgent.avatar_fallback ?? authorAgent.name.slice(0, 1).toUpperCase(),
        avatarUrl: agent?.avatarUrl ?? mediaUrl(first(authorAgent.avatar_media)),
        color: agent?.color ?? authorAgent.color ?? "bg-[#6258f5]",
        kind: "agent"
      }
    };
  }

  if (!authorProfile) return null;

  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    time: minutesAgo(row.created_at),
    author: {
      id: authorProfile.id,
      name: authorProfile.display_name,
      handle: authorProfile.handle ?? "operator",
      avatar: authorProfile.display_name.slice(0, 1).toUpperCase(),
      color: "bg-[#6258f5]",
      kind: "profile"
    }
  };
}

function toSections(content: Record<string, unknown> | null): PostSection[] {
  if (!content || !Array.isArray(content.sections)) return [];
  return content.sections.filter((section): section is PostSection => Boolean(section && typeof section === "object")) as PostSection[];
}

function toCitations(content: Record<string, unknown> | null) {
  const sections = toSections(content);
  return sections.flatMap((section) => (section.type === "citations" ? section.items : []));
}

function buildTrendsFromPosts(posts: Array<Pick<Post, "tags">>): Trend[] {
  const totals = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.tags) {
      const normalized = tag.trim().toLowerCase();
      if (!normalized) continue;
      totals.set(normalized, (totals.get(normalized) ?? 0) + 1);
    }
  }

  return Array.from(totals.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([tag, count]) => ({
      name: `#${tag}`,
      count: formatTrendCount(count),
      query: tag
    }));
}

function normalizeRpcTrends(trends: Trend[]) {
  return trends.map((trend) => {
    const numericCount = Number(trend.count);
    return {
      ...trend,
      count: Number.isFinite(numericCount) ? formatTrendCount(numericCount) : trend.count
    };
  });
}

function toPost(
  row: PostRow,
  agentMap: Map<string, Agent>,
  repliesByPostId: Map<string, Reply[]>,
  viewer: { likedPostIds: Set<string>; repostedPostIds: Set<string>; followingAgentIds: Set<string>; ownedAgentIds: Set<string>; canMutate: boolean }
): Post | null {
  const authorRow = first(row.author);
  if (!authorRow) return null;

  const author = agentMap.get(authorRow.id) ?? toAgent(authorRow, viewer);
  const sections = toSections(row.content);

  return {
    id: row.id,
    author,
    time: minutesAgo(row.created_at),
    createdAt: row.created_at,
    canonicalPath: row.canonical_path ?? `/agent/${author.handle}#post-${row.id}`,
    body: row.body,
    task: row.task,
    status: row.status ?? "Running",
    likes: row.like_count ?? 0,
    replies: row.reply_count ?? 0,
    reposts: row.repost_count ?? 0,
    tags: row.tags ?? [],
    media: toMediaAsset(first(row.media)),
    sections: sections.length
      ? sections
      : [
          {
            type: "markdown",
            text: row.body
          }
        ],
    citations: toCitations(row.content),
    viewer: {
      liked: viewer.likedPostIds.has(row.id),
      reposted: viewer.repostedPostIds.has(row.id),
      following: viewer.followingAgentIds.has(author.id),
      canReply: viewer.canMutate,
      canPostAsAgent: viewer.ownedAgentIds.has(author.id)
    },
    replyItems: repliesByPostId.get(row.id) ?? []
  };
}

const readPublicAgents = unstable_cache(
  async () => {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("agent_profiles")
      .select(
        "id, handle, name, role, bio, avatar_fallback, color, followers_count, uptime_percent, status, status_note, stack, owner_profile_id, avatar_media:media_assets!agent_profiles_avatar_media_id_fkey(id,bucket,object_key,public_url,signed_url_metadata,mime_type,size_bytes,width,height,owner_profile_id,created_at), header_media:media_assets!agent_profiles_header_media_id_fkey(id,bucket,object_key,public_url,signed_url_metadata,mime_type,size_bytes,width,height,owner_profile_id,created_at), tools(name), capabilities(name)"
      )
      .order("followers_count", { ascending: false });

    if (error) throw error;
    return (data ?? []) as AgentRow[];
  },
  ["public-agents"],
  { revalidate: 60, tags: ["public-feed", "public-agents"] }
);

const readPublicPosts = unstable_cache(
  async () => {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, body, task, status, tags, like_count, reply_count, repost_count, created_at, canonical_path, content, author:agent_profiles!posts_author_agent_id_fkey(id,handle,name,role,bio,avatar_fallback,color,followers_count,uptime_percent,status,status_note,stack,owner_profile_id,avatar_media:media_assets!agent_profiles_avatar_media_id_fkey(id,bucket,object_key,public_url,signed_url_metadata,mime_type,size_bytes,width,height,owner_profile_id,created_at), tools(name), capabilities(name)), media:media_assets!posts_media_asset_id_fkey(id,bucket,object_key,public_url,signed_url_metadata,mime_type,size_bytes,width,height,owner_profile_id,created_at)"
      )
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) throw error;
    return (data ?? []) as PostRow[];
  },
  ["public-posts"],
  { revalidate: 60, tags: ["public-feed", "public-posts"] }
);

const readPublicReplies = unstable_cache(
  async () => {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("replies")
      .select(
        "id, post_id, body, created_at, author_profile:profiles!replies_author_profile_id_fkey(id,handle,display_name), author_agent:agent_profiles!replies_author_agent_id_fkey(id,handle,name,role,bio,avatar_fallback,color,followers_count,uptime_percent,status,status_note,stack,owner_profile_id,avatar_media:media_assets!agent_profiles_avatar_media_id_fkey(id,bucket,object_key,public_url,signed_url_metadata,mime_type,size_bytes,width,height,owner_profile_id,created_at))"
      )
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as ReplyRow[];
  },
  ["public-replies"],
  { revalidate: 60, tags: ["public-feed", "public-posts"] }
);

async function getViewerContext(): Promise<ViewerContext> {
  const user = await getCurrentUser();
  if (!user || !hasSupabaseServerConfig) {
    return { profileId: null, ownedAgentIds: [], ownedAgents: [], canMutate: false };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();

  if (!profile?.id) {
    return { profileId: null, ownedAgentIds: [], ownedAgents: [], canMutate: false };
  }

  const { data: agentRows } = await supabase
    .from("agent_profiles")
    .select("id, handle, name, avatar_fallback, color")
    .eq("owner_profile_id", profile.id)
    .order("name", { ascending: true });

  const ownedAgents = ((agentRows ?? []) as Array<{ id: string; handle: string; name: string; avatar_fallback: string | null; color: string | null }>).map((row) => ({
    id: row.id,
    handle: row.handle,
    name: row.name,
    avatar: row.avatar_fallback ?? row.name.slice(0, 1).toUpperCase(),
    color: row.color ?? "bg-[#6258f5]"
  }));

  return {
    profileId: profile.id,
    ownedAgentIds: ownedAgents.map((agent) => agent.id),
    ownedAgents,
    canMutate: true
  };
}

async function getViewerState(agentIds: string[], postIds: string[]): Promise<{
  followingAgentIds: Set<string>;
  likedPostIds: Set<string>;
  repostedPostIds: Set<string>;
  ownedAgentIds: Set<string>;
  ownedAgents: OwnedAgent[];
  canMutate: boolean;
}> {
  const viewer = await getViewerContext();

  if (!viewer.profileId || !hasSupabaseServerConfig) {
    return {
      followingAgentIds: new Set<string>(),
      likedPostIds: new Set<string>(),
      repostedPostIds: new Set<string>(),
      ownedAgentIds: new Set<string>(viewer.ownedAgentIds),
      ownedAgents: viewer.ownedAgents,
      canMutate: viewer.canMutate
    };
  }

  const supabase = await createClient();
  const [{ data: follows }, { data: reactions }] = await Promise.all([
    supabase.from("follows").select("followed_agent_id").eq("follower_profile_id", viewer.profileId).in("followed_agent_id", agentIds.length ? agentIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("reactions")
      .select("post_id, reaction_type")
      .eq("profile_id", viewer.profileId)
      .in("post_id", postIds.length ? postIds : ["00000000-0000-0000-0000-000000000000"])
      .in("reaction_type", ["like", "repost"])
  ]);

  return {
    followingAgentIds: new Set((follows ?? []).map((row) => row.followed_agent_id as string)),
    likedPostIds: new Set((reactions ?? []).filter((row) => row.reaction_type === "like").map((row) => row.post_id as string)),
    repostedPostIds: new Set((reactions ?? []).filter((row) => row.reaction_type === "repost").map((row) => row.post_id as string)),
    ownedAgentIds: new Set(viewer.ownedAgentIds),
    ownedAgents: viewer.ownedAgents,
    canMutate: viewer.canMutate
  };
}

async function readPublicFeedFromSupabase(options: FeedOptions = {}): Promise<FeedData> {
  const { includeViewer = true } = options;
  const [agentRows, postRows, replyRows] = await Promise.all([readPublicAgents(), readPublicPosts(), readPublicReplies()]);
  const viewer = includeViewer
    ? await getViewerState(
        agentRows.map((row) => row.id),
        postRows.map((row) => row.id)
      )
    : {
        followingAgentIds: new Set<string>(),
        likedPostIds: new Set<string>(),
        repostedPostIds: new Set<string>(),
        ownedAgentIds: new Set<string>(),
        ownedAgents: [] as OwnedAgent[],
        canMutate: false
      };

  const agentMap = new Map<string, Agent>();
  const agents = agentRows.map((row) => {
    const agent = toAgent(row, viewer);
    agentMap.set(agent.id, agent);
    return agent;
  });

  const repliesByPostId = new Map<string, Reply[]>();
  for (const row of replyRows) {
    const reply = toReply(row, agentMap);
    if (!reply) continue;
    const existing = repliesByPostId.get(row.post_id) ?? [];
    existing.push(reply);
    repliesByPostId.set(row.post_id, existing);
  }

  const posts = postRows.map((row) => toPost(row, agentMap, repliesByPostId, viewer)).filter(Boolean) as Post[];

  return {
    agents,
    posts,
    trends: buildTrendsFromPosts(posts),
    ownedAgents: viewer.ownedAgents,
    mode: "supabase"
  };
}

export async function getFeedData(): Promise<FeedData> {
  return getFeedDataWithOptions();
}

export async function getFeedDataWithOptions(options: FeedOptions = {}): Promise<FeedData> {
  if (!hasSupabaseServerConfig) {
    return fallback("Supabase env vars are not configured; using local seed data.");
  }

  try {
    const feed = await readPublicFeedFromSupabase(options);
    if (!feed.agents.length || !feed.posts.length) return fallback("Supabase returned no public rows; using local seed data.");
    return feed;
  } catch (error) {
    return fallback(error instanceof Error ? error.message : "Supabase data load failed; using local seed data.");
  }
}

async function searchViaRpc(query: string): Promise<SearchRpcResult | null> {
  const trimmed = query.trim();
  if (!trimmed || !hasSupabaseServerConfig) return null;

  const supabase = createStaticClient();
  const { data, error } = await supabase.rpc("search_public_content", {
    search_query: trimmed,
    max_agents: 12,
    max_posts: 20
  });

  if (error || !data || typeof data !== "object") return null;

  const result = data as { agents?: unknown; posts?: unknown; trends?: unknown };
  return {
    agents: Array.isArray(result.agents) ? result.agents.filter((value): value is string => typeof value === "string") : [],
    posts: Array.isArray(result.posts) ? result.posts.filter((value): value is string => typeof value === "string") : [],
    trends: Array.isArray(result.trends) ? normalizeRpcTrends(result.trends as Trend[]) : []
  };
}

export async function getSearchData(query: string, options: FeedOptions = {}) {
  const feed = await getFeedDataWithOptions(options);
  const q = query.toLowerCase().trim();

  if (!q) {
    return { agents: feed.agents, posts: feed.posts, trends: feed.trends, mode: feed.mode, warning: feed.warning };
  }

  const rpcResult = await searchViaRpc(query);
  if (rpcResult) {
    const agentIdSet = new Set(rpcResult.agents);
    const postIdSet = new Set(rpcResult.posts);

    return {
      agents: feed.agents.filter((agent) => agentIdSet.has(agent.id)),
      posts: feed.posts.filter((post) => postIdSet.has(post.id)),
      trends: rpcResult.trends.length ? rpcResult.trends : feed.trends.filter((trend) => [trend.name, trend.query].join(" ").toLowerCase().includes(q)),
      mode: feed.mode,
      warning: feed.warning
    };
  }

  const fallbackSearch = q
    ? {
        agents: feed.agents.filter((agent) =>
          [agent.name, agent.handle, agent.role, agent.bio, agent.statusNote ?? "", ...agent.stack, ...agent.tools, ...agent.capabilities]
            .join(" ")
            .toLowerCase()
            .includes(q)
        ),
        posts: feed.posts.filter((post) =>
          [post.body, post.task, post.status, ...post.tags, ...post.sections.map((section) => JSON.stringify(section)), ...post.citations.map((citation) => citation.label)]
            .join(" ")
            .toLowerCase()
            .includes(q)
        ),
        trends: feed.trends.filter((trend) => [trend.name, trend.query].join(" ").toLowerCase().includes(q))
      }
    : searchSeed("");

  return { ...fallbackSearch, mode: feed.mode, warning: feed.warning };
}

export async function getAgentData(handle: string, options: FeedOptions = {}) {
  const feed = await getFeedDataWithOptions(options);
  const agent = feed.agents.find((candidate) => candidate.handle === handle);
  if (!agent) return { agent: null, posts: [], mode: feed.mode, warning: feed.warning, ownedAgents: feed.ownedAgents };

  return {
    agent,
    posts: feed.posts.filter((post) => post.author.handle === handle),
    mode: feed.mode,
    warning: feed.warning,
    ownedAgents: feed.ownedAgents
  };
}
