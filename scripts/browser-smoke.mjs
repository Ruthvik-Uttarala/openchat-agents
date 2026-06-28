import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const executablePath =
  process.env.CHROME_EXECUTABLE_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const isLocalBase = /127\.0\.0\.1|localhost/.test(baseUrl);
const artifactDir = path.join(process.cwd(), "tmp", "browser-smoke");
fs.mkdirSync(artifactDir, { recursive: true });

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

async function screenshotStats(page, rect, fileName) {
  const imagePath = path.join(artifactDir, fileName);
  await page.screenshot({ path: imagePath, fullPage: false, animations: "disabled" });
  const base64 = fs.readFileSync(imagePath).toString("base64");

  return page.evaluate(
    async ({ dataUrl, rect }) => {
      const image = await new Promise((resolve, reject) => {
        const tag = new Image();
        tag.onload = () => resolve(tag);
        tag.onerror = reject;
        tag.src = dataUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(image, 0, 0);

      const x = Math.max(0, Math.floor(rect.x));
      const y = Math.max(0, Math.floor(rect.y));
      const width = Math.max(1, Math.min(canvas.width - x, Math.floor(rect.width)));
      const height = Math.max(1, Math.min(canvas.height - y, Math.floor(rect.height)));
      const { data } = ctx.getImageData(x, y, width, height);

      let min = 255;
      let max = 0;
      let sum = 0;
      let pixels = 0;
      let bright = 0;
      let dark = 0;

      for (let index = 0; index < data.length; index += 4) {
        const alpha = data[index + 3];
        if (alpha < 8) continue;
        const luminance = 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
        min = Math.min(min, luminance);
        max = Math.max(max, luminance);
        sum += luminance;
        pixels += 1;
        if (luminance >= 210) bright += 1;
        if (luminance <= 60) dark += 1;
      }

      return {
        average: pixels ? sum / pixels : 0,
        contrast: max - min,
        brightRatio: pixels ? bright / pixels : 0,
        darkRatio: pixels ? dark / pixels : 0
      };
    },
    { dataUrl: `data:image/png;base64,${base64}`, rect }
  );
}

async function validateReadableSurface(page, locator, label, expected) {
  const box = await locator.boundingBox();
  assert(box && box.width > 20 && box.height > 20, `${label} has no measurable bounds.`);
  const stats = await screenshotStats(page, box, `${label.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}.png`);
  assert(stats, `${label} screenshot stats could not be computed.`);

  if (expected === "light") {
    assert(stats.average >= 100, `${label} is darker than expected (${stats.average.toFixed(1)}).`);
    assert(stats.contrast >= 25, `${label} lacks readable contrast (${stats.contrast.toFixed(1)}).`);
  } else {
    assert(stats.brightRatio >= 0.02, `${label} is missing bright readable content.`);
    assert(stats.darkRatio >= 0.2, `${label} is missing dark background separation.`);
    assert(stats.contrast >= 80, `${label} lacks readable contrast (${stats.contrast.toFixed(1)}).`);
  }
}

async function validateLayering(page, label) {
  const layering = await page.evaluate(() => {
    const root = document.querySelector(".space-page");
    if (!root) return null;
    const before = getComputedStyle(root, "::before");
    const after = getComputedStyle(root, "::after");
    const childZ = Array.from(root.children)
      .slice(0, 8)
      .map((element) => {
        const style = getComputedStyle(element);
        return {
          tag: element.tagName.toLowerCase(),
          zIndex: style.zIndex,
          position: style.position
        };
      });

    return {
      before: { zIndex: before.zIndex, pointerEvents: before.pointerEvents, position: before.position },
      after: { zIndex: after.zIndex, pointerEvents: after.pointerEvents, position: after.position },
      childZ
    };
  });

  assert(layering, `${label} is missing .space-page.`);
  assert(layering.before.pointerEvents === "none", `${label} before overlay must ignore pointer events.`);
  assert(layering.after.pointerEvents === "none", `${label} after overlay must ignore pointer events.`);
  assert(Number(layering.before.zIndex || "0") <= 0, `${label} before overlay is stacked above content.`);
  assert(Number(layering.after.zIndex || "0") <= 0, `${label} after overlay is stacked above content.`);
  assert(
    layering.childZ.some((entry) => (entry.zIndex === "auto" ? 0 : Number(entry.zIndex || "0")) >= 1),
    `${label} content is not stacked above decorative artwork.`
  );
}

async function validateKeyboardFocus(page, label) {
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const element = document.activeElement;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      tag: element.tagName.toLowerCase(),
      width: rect.width,
      height: rect.height,
      visible: rect.width > 0 && rect.height > 0,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow
    };
  });

  assert(focused?.visible, `${label} keyboard focus is not visible.`);
}

async function validateHome(page, label) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await validateNoOverflow(page, `${label} home`);
  await validateLayering(page, `${label} home`);
  const heroHeading = page.getByRole("heading", { name: /agent work, in public, at machine speed/i });
  await heroHeading.waitFor();
  await validateReadableSurface(page, heroHeading, `${label} home hero`, "dark");
  const firstPost = page.locator("article").first();
  await firstPost.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await validateReadableSurface(page, firstPost, `${label} home first post`, "light");
  await validateKeyboardFocus(page, `${label} home`);

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
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
  }

  const likeStatus = await page.evaluate(async (origin) => {
    const response = await fetch(`${origin}/api/posts/00000000-0000-4000-8000-000000001001/like`, { method: "POST" });
    return response.status;
  }, baseUrl);
  assert([401, 503].includes(likeStatus), `${label} unauthenticated like returned ${likeStatus} instead of 401/503.`);
}

async function validateSearch(page, label) {
  await page.goto(`${baseUrl}/search?q=tool`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await validateNoOverflow(page, `${label} search`);
  await validateLayering(page, `${label} search`);
  const heading = page.getByRole("heading", { name: /discover agents, tools, and work traces/i });
  await heading.waitFor();
  await validateReadableSurface(page, heading, `${label} search heading`, "light");
  const searchForm = page.locator("form").first();
  await validateReadableSurface(page, searchForm, `${label} search form`, "light");
  const resultsPanel = page.locator(".space-window").nth(1);
  if (await resultsPanel.count()) {
    await validateReadableSurface(page, resultsPanel, `${label} search results`, "light");
  }
}

async function validateProfile(page, label) {
  await page.goto(`${baseUrl}/agent/atlas`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await validateNoOverflow(page, `${label} profile`);
  await validateLayering(page, `${label} profile`);
  const heading = page.getByRole("heading", { name: "Atlas" });
  await heading.waitFor();
  await validateReadableSurface(page, heading, `${label} profile heading`, "dark");
  const profilePanelLink = page.getByRole("link", { name: /agent api/i }).first();
  if (await profilePanelLink.count()) {
    await profilePanelLink.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await validateReadableSurface(page, profilePanelLink, `${label} profile panel`, "light");
  }

  const shareButton = page.getByRole("button", { name: /^share$/i }).first();
  if (await shareButton.isVisible().catch(() => false)) {
    await shareButton.click();
    await page.waitForTimeout(300);
  }

  const followStatus = await page.evaluate(async (origin) => {
    const response = await fetch(`${origin}/api/agents/atlas/follow`, { method: "POST" });
    return response.status;
  }, baseUrl);
  assert([401, 503].includes(followStatus), `${label} unauthenticated follow returned ${followStatus} instead of 401/503.`);
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
    const httpFailures = [];

    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (isLocalBase && text.includes("/_vercel/speed-insights/script.js")) return;
      if (/Failed to load resource: the server responded with a status of 401/i.test(text)) return;
      if (/Failed to load resource: the server responded with a status of 404/i.test(text)) return;
      consoleErrors.push(text);
    });
    page.on("requestfailed", (request) => {
      const url = request.url();
      if (url.includes("_rsc=")) return;
      if (isLocalBase && url.includes("/_vercel/speed-insights/script.js")) return;
      failedRequests.push(`${request.method()} ${url} :: ${request.failure()?.errorText ?? "failed"}`);
    });
    page.on("response", (response) => {
      const url = response.url();
      if (!url.startsWith(baseUrl)) return;
      const status = response.status();
      const method = response.request().method();
      if (url.includes("_rsc=")) return;
      if (isLocalBase && url.includes("/_vercel/speed-insights/script.js")) return;
      if (status >= 400 && !(status === 401 && method === "POST")) {
        httpFailures.push(`${status} ${method} ${url}`);
      }
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

    if (httpFailures.length) {
      failures.push(`${viewport.name}: http failures -> ${httpFailures.join(" | ")}`);
    }

    summary.push({
      viewport: viewport.name,
      consoleErrors: consoleErrors.length,
      failedRequests: failedRequests.length,
      httpFailures: httpFailures.length
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
