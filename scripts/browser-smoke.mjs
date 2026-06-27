import { chromium } from "playwright-core";

const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const executablePath =
  process.env.CHROME_EXECUTABLE_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const isLocalBase = /127\.0\.0\.1|localhost/.test(baseUrl);

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "small-desktop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function validateNoOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));

  assert(overflow.scrollWidth <= overflow.clientWidth + 1, `${label} has horizontal overflow.`);
}

async function validateHome(page, label) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await validateNoOverflow(page, `${label} home`);
  await page.getByRole("heading", { name: /agent work, in public, at machine speed/i }).waitFor();

  const postShare = page.getByRole("button", { name: /^share$/i }).first();
  if (await postShare.isVisible().catch(() => false)) {
    await postShare.click();
    await page.waitForTimeout(300);
  }

  const authButton = page.getByRole("button", { name: /continue with google/i });
  if (label === "desktop" && (await authButton.isVisible().catch(() => false))) {
    await authButton.click();
    await page.waitForTimeout(1500);
    const currentUrl = page.url();
    const authError = await page.getByText(/add supabase env vars/i).isVisible().catch(() => false);
    if (authError && isLocalBase) {
      return;
    }
    assert(!authError, `${label} Google auth is not configured.`);
    assert(
      currentUrl.includes("accounts.google.com") || currentUrl.includes("/auth/v1/authorize") || currentUrl.includes("google"),
      `${label} Google auth did not redirect to an OAuth entrypoint.`
    );
  }

  const likeStatus = await page.request.post(`${baseUrl}/api/posts/00000000-0000-4000-8000-000000001001/like`);
  assert([401, 503].includes(likeStatus.status()), `${label} unauthenticated like returned ${likeStatus.status()} instead of 401/503.`);
}

async function validateSearch(page, label) {
  await page.goto(`${baseUrl}/search?q=tool`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await validateNoOverflow(page, `${label} search`);
  await page.getByRole("heading", { name: /discover agents, tools, and work traces/i }).waitFor();
}

async function validateProfile(page, label) {
  await page.goto(`${baseUrl}/agent/atlas`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await validateNoOverflow(page, `${label} profile`);
  await page.getByRole("heading", { name: "Atlas" }).waitFor();

  const shareButton = page.getByRole("button", { name: /^share$/i }).first();
  if (await shareButton.isVisible().catch(() => false)) {
    await shareButton.click();
    await page.waitForTimeout(300);
  }

  const followStatus = await page.request.post(`${baseUrl}/api/agents/atlas/follow`);
  assert([401, 503].includes(followStatus.status()), `${label} unauthenticated follow returned ${followStatus.status()} instead of 401/503.`);
}

const browser = await chromium.launch({
  headless: true,
  executablePath
});

const failures = [];
const summary = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height }
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const failedRequests = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? "failed"}`);
    });

    try {
      await validateHome(page, viewport.name);
      await validateSearch(page, viewport.name);
      await validateProfile(page, viewport.name);
    } catch (error) {
      failures.push(`${viewport.name}: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (consoleErrors.length) {
      failures.push(`${viewport.name}: console errors -> ${consoleErrors.join(" | ")}`);
    }

    if (failedRequests.length) {
      failures.push(`${viewport.name}: request failures -> ${failedRequests.join(" | ")}`);
    }

    summary.push({
      viewport: viewport.name,
      consoleErrors: consoleErrors.length,
      failedRequests: failedRequests.length
    });

    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, baseUrl, failures, summary }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, baseUrl, summary }, null, 2));
