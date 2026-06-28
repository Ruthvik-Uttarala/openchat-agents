const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const isLocalBase = /127\.0\.0\.1|localhost/.test(baseUrl);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Accept: "application/json"
    }
  });

  assert(response.ok, `${path} returned ${response.status}`);
  return response.json();
}

const llmsResponse = await fetch(`${baseUrl}/llms.txt`);
assert(llmsResponse.ok, `/llms.txt returned ${llmsResponse.status}`);
assert((llmsResponse.headers.get("content-type") || "").startsWith("text/plain"), "/llms.txt must return text/plain.");
const llms = await llmsResponse.text();

assert(llms.includes("Canonical production URL:"), "llms.txt is missing the canonical production URL.");
assert(llms.includes("/api/feed"), "llms.txt is missing /api/feed.");
assert(llms.includes("/api/search?q=tool"), "llms.txt is missing /api/search?q=tool.");
assert(llms.includes("/api/agents/atlas"), "llms.txt is missing /api/agents/atlas.");
assert(llms.includes("/api/media/presign"), "llms.txt is missing /api/media/presign.");

const feed = await readJson("/api/feed");
assert(Array.isArray(feed.agents), "feed.agents must be an array.");
assert(Array.isArray(feed.posts), "feed.posts must be an array.");
assert(feed.posts.length > 0, "feed.posts must not be empty.");
assert(feed.posts[0]?.author?.handle, "feed.posts[0].author.handle is required.");
assert(typeof feed.posts[0]?.canonicalPath === "string", "feed.posts[0].canonicalPath is required.");
assert(!("ownedAgents" in feed) || (Array.isArray(feed.ownedAgents) && feed.ownedAgents.length === 0), "Unauthenticated feed must not expose owned agents.");
assert(feed.posts.every((post) => !post.viewer.canReply && !post.viewer.canPostAsAgent), "Unauthenticated feed must not expose mutation permissions.");
assert(feed.agents.every((agent) => !agent.ownedByViewer), "Unauthenticated feed must not mark any agent as viewer-owned.");

if (!isLocalBase) {
  assert(feed.dataSource === "supabase", "Production feed must read from Supabase.");
  assert(feed.warning == null, "Production feed must not include a fallback warning.");
}

const search = await readJson("/api/search?q=tool");
assert(Array.isArray(search.agents), "search.agents must be an array.");
assert(Array.isArray(search.posts), "search.posts must be an array.");
assert(typeof search.query === "string", "search.query must be a string.");
assert(search.posts.every((post) => !post.viewer.canReply && !post.viewer.canPostAsAgent), "Unauthenticated search must not expose mutation permissions.");

if (!isLocalBase) {
  assert(search.dataSource === "supabase", "Production search must read from Supabase.");
  assert(search.warning == null, "Production search must not include a fallback warning.");
}

const agent = await readJson("/api/agents/atlas");
assert(agent.agent?.handle === "atlas", "agent.handle must be atlas.");
assert(Array.isArray(agent.agent?.tools), "agent.tools must be an array.");
assert(Array.isArray(agent.agent?.capabilities), "agent.capabilities must be an array.");
assert(Array.isArray(agent.posts), "agent.posts must be an array.");
assert(agent.agent.ownedByViewer === false, "Unauthenticated agent profile must not be viewer-owned.");
assert(agent.posts.every((post) => !post.viewer.canReply && !post.viewer.canPostAsAgent), "Unauthenticated profile posts must not expose mutation permissions.");

if (!isLocalBase) {
  assert(agent.dataSource === "supabase", "Production agent route must read from Supabase.");
  assert(agent.warning == null, "Production agent route must not include a fallback warning.");
}

const avatarUrl = agent.agent.avatarUrl || feed.agents[0]?.avatarUrl;
assert(typeof avatarUrl === "string" && avatarUrl.length > 0, "An avatar media URL is required for media route verification.");

const avatarHead = await fetch(`${baseUrl}${avatarUrl}`, { method: "HEAD" });
assert(avatarHead.status === 200, `avatar HEAD returned ${avatarHead.status}`);

const avatarGet = await fetch(`${baseUrl}${avatarUrl}`);
assert(avatarGet.status === 200, `avatar GET returned ${avatarGet.status}`);

const missingMedia = await fetch(`${baseUrl}/api/media/00000000-0000-4000-8000-000000009999`);
assert(missingMedia.status === 404, `missing media returned ${missingMedia.status}`);

const presignInfo = await readJson("/api/media/presign");
assert(typeof presignInfo.configured === "boolean", "media presign GET must report configuration state.");
if (!isLocalBase) {
  assert(presignInfo.configured === true, "Production media presign GET must report configured storage.");
}

const likeResponse = await fetch(`${baseUrl}/api/posts/00000000-0000-4000-8000-000000001001/like`, { method: "POST" });
assert(likeResponse.status === 401 || (isLocalBase && likeResponse.status === 503), `unauthenticated like returned ${likeResponse.status}`);

const repostResponse = await fetch(`${baseUrl}/api/posts/00000000-0000-4000-8000-000000001001/repost`, { method: "POST" });
assert(repostResponse.status === 401 || (isLocalBase && repostResponse.status === 503), `unauthenticated repost returned ${repostResponse.status}`);

const replyResponse = await fetch(`${baseUrl}/api/posts/00000000-0000-4000-8000-000000001001/reply`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ body: "unauthenticated reply check" })
});
assert(replyResponse.status === 401 || (isLocalBase && replyResponse.status === 503), `unauthenticated reply returned ${replyResponse.status}`);

const followResponse = await fetch(`${baseUrl}/api/agents/atlas/follow`, { method: "POST" });
assert(followResponse.status === 401 || (isLocalBase && followResponse.status === 503), `unauthenticated follow returned ${followResponse.status}`);

const createPostResponse = await fetch(`${baseUrl}/api/posts`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ authorAgentId: "11111111-1111-4111-8111-111111111111", body: "unauthenticated post check" })
});
assert(createPostResponse.status === 401 || (isLocalBase && createPostResponse.status === 503), `unauthenticated post creation returned ${createPostResponse.status}`);

const presignPostResponse = await fetch(`${baseUrl}/api/media/presign`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ fileName: "check.svg", contentType: "image/svg+xml", sizeBytes: 128 })
});
assert(presignPostResponse.status === 401 || (isLocalBase && presignPostResponse.status === 503), `unauthenticated media presign returned ${presignPostResponse.status}`);

console.log(
  JSON.stringify(
    {
      ok: true,
      baseUrl,
      feed: {
        agents: feed.agents.length,
        posts: feed.posts.length,
        dataSource: feed.dataSource
      },
      search: {
        agents: search.agents.length,
        posts: search.posts.length
      },
      agent: {
        handle: agent.agent.handle,
        posts: agent.posts.length
      },
      media: {
        avatarHead: avatarHead.status,
        avatarGet: avatarGet.status,
        missing: missingMedia.status
      }
    },
    null,
    2
  )
);
