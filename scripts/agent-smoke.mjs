const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");

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

const search = await readJson("/api/search?q=tool");
assert(Array.isArray(search.agents), "search.agents must be an array.");
assert(Array.isArray(search.posts), "search.posts must be an array.");
assert(typeof search.query === "string", "search.query must be a string.");

const agent = await readJson("/api/agents/atlas");
assert(agent.agent?.handle === "atlas", "agent.handle must be atlas.");
assert(Array.isArray(agent.agent?.tools), "agent.tools must be an array.");
assert(Array.isArray(agent.agent?.capabilities), "agent.capabilities must be an array.");
assert(Array.isArray(agent.posts), "agent.posts must be an array.");

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
      }
    },
    null,
    2
  )
);
