import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const baseUrl = (process.env.BASE_URL || "https://openchat-agents.vercel.app").replace(/\/+$/, "");
const executablePath = process.env.CHROME_EXECUTABLE_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const artifactDir = path.join(process.cwd(), "tmp", "auth-verify");
const userDataDir = path.join(process.cwd(), ".tmp", "prod-auth-profile");

fs.mkdirSync(artifactDir, { recursive: true });
fs.mkdirSync(userDataDir, { recursive: true });

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "small-desktop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide-desktop", width: 1920, height: 1080 }
];

const uniqueId = Date.now().toString();
const replyBody = `Prod reply ${uniqueId}`;
const postBody = `Prod artifact ${uniqueId}: verified social mutations, R2 media, and session persistence on the live graph.`;
const taskLabel = `Production auth verification ${uniqueId}`;
const uploadPath = path.join(process.cwd(), ".tmp", `prod-auth-artifact-${uniqueId}.svg`);

fs.writeFileSync(
  uploadPath,
  `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
    <rect width="1600" height="900" fill="#180018"/>
    <rect x="80" y="80" width="1440" height="740" rx="40" fill="#ffffff"/>
    <circle cx="300" cy="220" r="48" fill="#5657e8"/>
    <circle cx="1340" cy="180" r="30" fill="#c84c56"/>
    <text x="170" y="250" font-family="Arial, sans-serif" font-size="88" font-weight="700" fill="#180018">OpenChat production verification</text>
    <text x="170" y="360" font-family="Arial, sans-serif" font-size="42" fill="#310033">Auth, feed actions, and R2 upload checked on the live graph.</text>
    <text x="170" y="460" font-family="Arial, sans-serif" font-size="32" fill="#796168">${uniqueId}</text>
    <rect x="170" y="540" width="520" height="120" rx="24" fill="#f1ecf3"/>
    <text x="210" y="610" font-family="Arial, sans-serif" font-size="30" fill="#180018">media artifact</text>
    <text x="210" y="650" font-family="Arial, sans-serif" font-size="24" fill="#796168">stored in Cloudflare R2</text>
  </svg>`,
  "utf8"
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readAuthedJson(page, route) {
  const payload = await page.evaluate(async (path) => {
    const response = await fetch(path, { headers: { Accept: "application/json" } });
    const json = await response.json().catch(() => null);
    return { status: response.status, json };
  }, route);

  assert(payload.status === 200, `${route} returned ${payload.status}`);
  return payload.json;
}

async function waitForAuthedState(page) {
  await page.waitForFunction(
    () => {
      const logout = document.querySelector('form[action="/auth/signout"] button');
      const composer = document.querySelector('select');
      return Boolean(logout || composer);
    },
    { timeout: 480000 }
  );
}

async function screenshot(page, viewport, label) {
  const filePath = path.join(artifactDir, `${viewport}-${label}.png`);
  await page.screenshot({ path: filePath, fullPage: true, animations: "disabled" });
  return filePath;
}

async function ensureLoggedIn(page) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 120000 });
  const loginButton = page.getByRole("button", { name: /continue with google/i });
  if (await loginButton.isVisible().catch(() => false)) {
    await loginButton.click();
    await waitForAuthedState(page);
  }

  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 120000 });
  const logoutButton = page.getByRole("button", { name: /log out/i });
  assert(await logoutButton.isVisible().catch(() => false), "Signed-in state was not established after manual Google login.");
  await page.reload({ waitUntil: "networkidle", timeout: 120000 });
  assert(await logoutButton.isVisible().catch(() => false), "Session did not survive reload.");
}

async function verifyFollowFlow(page, agentHandle, initialFollowing) {
  await page.goto(`${baseUrl}/agent/${agentHandle}`, { waitUntil: "networkidle", timeout: 120000 });
  const button = page.getByRole("button", { name: /follow|following/i }).first();
  await button.click();
  await page.waitForTimeout(1000);

  const afterToggle = await readAuthedJson(page, `/api/agents/${agentHandle}`);
  assert(afterToggle.agent.isFollowing === !initialFollowing, "Follow toggle did not persist in the API response.");

  await page.reload({ waitUntil: "networkidle", timeout: 120000 });
  const textAfterReload = (await button.textContent())?.trim();
  assert(
    (initialFollowing && textAfterReload === "Follow") || (!initialFollowing && textAfterReload === "Following"),
    "Follow button state did not survive reload."
  );

  await button.click();
  await page.waitForTimeout(1000);
  const reverted = await readAuthedJson(page, `/api/agents/${agentHandle}`);
  assert(reverted.agent.isFollowing === initialFollowing, "Follow state did not revert.");

  await page.reload({ waitUntil: "networkidle", timeout: 120000 });
  const revertedLabel = (await button.textContent())?.trim();
  assert(
    (initialFollowing && revertedLabel === "Following") || (!initialFollowing && revertedLabel === "Follow"),
    "Follow button did not return to its original state after reload."
  );
}

async function verifyReactionFlow(page, postId, kind, initialValue) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 120000 });
  const article = page.locator(`#post-${postId}`);
  await article.scrollIntoViewIfNeeded();
  const button = article.locator('button[aria-pressed]').nth(kind === "repost" ? 0 : 1);

  await button.click();
  await page.waitForTimeout(800);

  const feedAfterToggle = await readAuthedJson(page, "/api/feed");
  const toggledPost = feedAfterToggle.posts.find((post) => post.id === postId);
  assert(Boolean(toggledPost), `Post ${postId} disappeared from feed.`);
  assert(toggledPost.viewer[kind === "repost" ? "reposted" : "liked"] === !initialValue, `${kind} state did not persist.`);

  await page.reload({ waitUntil: "networkidle", timeout: 120000 });
  const pressedAfterReload = (await button.getAttribute("aria-pressed")) === "true";
  assert(pressedAfterReload === !initialValue, `${kind} button state did not survive reload.`);

  await button.click();
  await page.waitForTimeout(800);
  const revertedFeed = await readAuthedJson(page, "/api/feed");
  const revertedPost = revertedFeed.posts.find((post) => post.id === postId);
  assert(revertedPost.viewer[kind === "repost" ? "reposted" : "liked"] === initialValue, `${kind} state did not revert.`);
}

async function verifyReplyFlow(page, postId) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 120000 });
  const article = page.locator(`#post-${postId}`);
  await article.scrollIntoViewIfNeeded();
  const toggleThread = article.getByRole("button", { name: /show thread|hide thread/i }).first();
  await toggleThread.click();
  const textarea = article.locator('textarea[placeholder="Add a public reply"]').first();
  await textarea.fill(replyBody);
  await article.getByRole("button", { name: /send reply/i }).click();
  await page.waitForTimeout(1200);

  const feed = await readAuthedJson(page, "/api/feed");
  const repliedPost = feed.posts.find((post) => post.id === postId);
  assert(repliedPost.replyItems.some((reply) => reply.body === replyBody), "Reply was not persisted in the feed response.");

  await page.reload({ waitUntil: "networkidle", timeout: 120000 });
  await article.scrollIntoViewIfNeeded();
  await toggleThread.click();
  await page.waitForTimeout(300);
  assert(await article.getByText(replyBody).isVisible().catch(() => false), "Reply text is missing after reload.");
}

async function verifyShareFlow(page, postId) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 120000 });
  const article = page.locator(`#post-${postId}`);
  await article.scrollIntoViewIfNeeded();
  const shareButton = article.getByRole("button", { name: /^share$/i }).first();
  await shareButton.click();
  await page.waitForTimeout(800);
  const label = ((await shareButton.textContent()) || "").trim();
  assert(label === "Copied" || label === "Share", "Share control did not return a valid confirmation state.");
}

async function verifyPostCreationAndMedia(page) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 120000 });

  const textarea = page.locator('textarea[placeholder="Share the latest result, trail, or lesson."]').first();
  await textarea.fill(postBody);
  await page.locator('input[placeholder="Current task"]').first().fill(taskLabel);
  await page.locator('input[placeholder="tags, comma, separated"]').first().fill("prod, verification, r2");
  await page.locator('input[type="file"]').first().setInputFiles(uploadPath);
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /publish update|publishing|published/i }).first().click();
  await page.waitForTimeout(1800);

  assert(await page.getByText(postBody).first().isVisible().catch(() => false), "Published post did not render in the UI.");

  const feed = await readAuthedJson(page, "/api/feed");
  const createdPost = feed.posts.find((post) => post.body === postBody);
  assert(createdPost, "Published post is missing from the authenticated feed response.");
  assert(createdPost.media?.publicUrl, "Published post is missing media metadata.");

  const mediaStatus = await page.evaluate(async (url) => {
    const head = await fetch(url, { method: "HEAD" });
    const get = await fetch(url);
    return {
      head: head.status,
      get: get.status
    };
  }, createdPost.media.publicUrl);

  assert(mediaStatus.head === 200, `Uploaded media HEAD returned ${mediaStatus.head}.`);
  assert(mediaStatus.get === 200, `Uploaded media GET returned ${mediaStatus.get}.`);

  return createdPost;
}

async function captureSignedInScreenshots(page, mutablePostId) {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 120000 });
    await screenshot(page, viewport.name, "home");
    await screenshot(page, viewport.name, "composer");

    await page.goto(`${baseUrl}/search?q=tool`, { waitUntil: "networkidle", timeout: 120000 });
    await screenshot(page, viewport.name, "search");

    await page.goto(`${baseUrl}/agent/atlas`, { waitUntil: "networkidle", timeout: 120000 });
    await screenshot(page, viewport.name, "agent-atlas");

    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 120000 });
    const article = page.locator(`#post-${mutablePostId}`);
    await article.scrollIntoViewIfNeeded();
    const toggleThread = article.getByRole("button", { name: /show thread|hide thread/i }).first();
    await toggleThread.click();
    await page.waitForTimeout(400);
    await screenshot(page, viewport.name, "thread");
  }
}

const browser = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  executablePath,
  viewport: { width: 1440, height: 900 }
});

browser.setDefaultTimeout(120000);

const page = browser.pages()[0] || (await browser.newPage());
const consoleErrors = [];
const requestFailures = [];

page.on("console", (msg) => {
  if (msg.type() === "error") {
    const text = msg.text();
    if (/Failed to load resource: the server responded with a status of 401/i.test(text)) return;
    consoleErrors.push(text);
  }
});

page.on("requestfailed", (request) => {
  requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? "failed"}`);
});

let results;

try {
  await ensureLoggedIn(page);

  const feed = await readAuthedJson(page, "/api/feed");
  assert(feed.dataSource === "supabase", "Authenticated production feed is not reading from Supabase.");
  assert(feed.warning == null, "Authenticated production feed returned a warning.");
  assert(Array.isArray(feed.ownedAgents) && feed.ownedAgents.length > 0, "Signed-in user does not own any agents.");

  const mutableAgent = feed.agents.find((agent) => !agent.ownedByViewer);
  assert(mutableAgent, "No non-owned public agent is available for follow verification.");

  const mutablePost = feed.posts.find((post) => !post.author.ownedByViewer) || feed.posts[0];
  assert(mutablePost, "No post is available for mutation verification.");

  await verifyFollowFlow(page, mutableAgent.handle, Boolean(mutableAgent.isFollowing));
  await verifyReactionFlow(page, mutablePost.id, "repost", Boolean(mutablePost.viewer.reposted));
  await verifyReactionFlow(page, mutablePost.id, "like", Boolean(mutablePost.viewer.liked));
  await verifyReplyFlow(page, mutablePost.id);
  await verifyShareFlow(page, mutablePost.id);
  const createdPost = await verifyPostCreationAndMedia(page);
  await captureSignedInScreenshots(page, mutablePost.id);

  results = {
    ok: true,
    baseUrl,
    artifactDir,
    ownedAgents: feed.ownedAgents.map((agent) => agent.handle),
    follow: {
      handle: mutableAgent.handle
    },
    post: {
      id: mutablePost.id
    },
    createdPost: {
      id: createdPost.id,
      canonicalPath: createdPost.canonicalPath,
      mediaUrl: createdPost.media?.publicUrl ?? null
    },
    consoleErrors,
    requestFailures
  };
} finally {
  await browser.close();
}

if (consoleErrors.length || requestFailures.length) {
  console.error(JSON.stringify({ ok: false, baseUrl, artifactDir, consoleErrors, requestFailures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(results, null, 2));
