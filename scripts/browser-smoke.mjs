import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const executablePath = process.env.CHROME_EXECUTABLE_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const isLocalBase = /127\.0\.0\.1|localhost/.test(baseUrl);
const artifactDir = path.join(process.cwd(), "tmp", "browser-smoke");
fs.mkdirSync(artifactDir, { recursive: true });

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "small-desktop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide-desktop", width: 1920, height: 1080 }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function screenshotPath(viewport, route) {
  return path.join(artifactDir, `${viewport}-${route}.png`);
}

async function captureFullPage(page, viewport, route) {
  const filePath = screenshotPath(viewport, route);
  await page.screenshot({ path: filePath, fullPage: true, animations: "disabled" });
  return filePath;
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

async function validateSurfaceTone(page, locator, label, expected) {
  const box = await locator.boundingBox();
  assert(box && box.width > 40 && box.height > 40, `${label} has no measurable bounds.`);
  const stats = await screenshotStats(page, box, `${label.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}-surface.png`);
  assert(stats, `${label} screenshot stats could not be computed.`);

  if (expected === "light") {
    assert(stats.average >= 170, `${label} is darker than expected (${stats.average.toFixed(1)}).`);
    assert(stats.darkRatio <= 0.35, `${label} contains too much dark artwork (${(stats.darkRatio * 100).toFixed(1)}%).`);
  } else {
    assert(stats.average <= 135, `${label} is brighter than expected (${stats.average.toFixed(1)}).`);
    assert(stats.brightRatio >= 0.01, `${label} is missing readable bright content.`);
    assert(stats.contrast >= 70, `${label} lacks readable contrast (${stats.contrast.toFixed(1)}).`);
  }
}

async function measureContrast(locator, label, { min = 4.5, pseudo = null } = {}) {
  const result = await locator.first().evaluate(
    (element, options) => {
      function parseColor(input) {
        if (!input) return null;
        const match = input.match(/rgba?\(([^)]+)\)/i);
        if (!match) return null;
        const parts = match[1]
          .split(",")
          .map((part) => part.trim())
          .map((part, index) => (index < 3 ? Number(part) : Number(part)));
        if (parts.length < 3 || parts.some((part, index) => index < 3 && Number.isNaN(part))) return null;
        return [parts[0], parts[1], parts[2], parts.length >= 4 && !Number.isNaN(parts[3]) ? parts[3] : 1];
      }

      function composite(top, bottom) {
        const alpha = top[3] + bottom[3] * (1 - top[3]);
        if (alpha <= 0) return [255, 255, 255, 0];
        return [
          (top[0] * top[3] + bottom[0] * bottom[3] * (1 - top[3])) / alpha,
          (top[1] * top[3] + bottom[1] * bottom[3] * (1 - top[3])) / alpha,
          (top[2] * top[3] + bottom[2] * bottom[3] * (1 - top[3])) / alpha,
          alpha
        ];
      }

      function relativeLuminance(color) {
        const convert = (value) => {
          const normalized = value / 255;
          return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        };

        return 0.2126 * convert(color[0]) + 0.7152 * convert(color[1]) + 0.0722 * convert(color[2]);
      }

      function contrastRatio(foreground, background) {
        const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
        const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
        return (lighter + 0.05) / (darker + 0.05);
      }

      function resolvedBackground(node) {
        const surfaceRoot =
          node.closest("button, a, input, textarea, article, .space-window, .space-hero, .space-banner, .space-rail") || node;
        let current = surfaceRoot;
        const layers = [];

        while (current) {
          const style = getComputedStyle(current);
          const parsed = parseColor(style.backgroundColor);
          if (parsed && parsed[3] > 0) {
            layers.push(parsed);
          }
          current = current.parentElement;
        }

        let color = [255, 255, 255, 1];
        for (let index = layers.length - 1; index >= 0; index -= 1) {
          color = composite(layers[index], color);
        }

        return color;
      }

      const style = getComputedStyle(element, options?.pseudo ?? undefined);
      const foreground = parseColor(style.color);
      const background = resolvedBackground(element);
      if (!foreground) return null;

      return {
        ratio: contrastRatio(foreground, background),
        foreground: foreground.slice(0, 3),
        background: background.slice(0, 3)
      };
    },
    { pseudo }
  );

  assert(result, `${label} contrast could not be measured.`);
  assert(
    result.ratio >= min,
    `${label} contrast is ${result.ratio.toFixed(2)}:1, below the required ${min.toFixed(1)}:1.`
  );

  return result;
}

async function validateLayering(page, label) {
  const layering = await page.evaluate(() => {
    const root = document.querySelector(".space-page");
    if (!root) return null;
    const before = getComputedStyle(root, "::before");
    const after = getComputedStyle(root, "::after");

    return {
      before: { content: before.content, pointerEvents: before.pointerEvents, zIndex: before.zIndex },
      after: { content: after.content, pointerEvents: after.pointerEvents, zIndex: after.zIndex }
    };
  });

  assert(layering, `${label} is missing .space-page.`);
  const beforeDisabled = layering.before.content === "none" || layering.before.content === '""';
  const afterDisabled = layering.after.content === "none" || layering.after.content === '""';
  assert(beforeDisabled, `${label} still renders a page-level ::before overlay.`);
  assert(afterDisabled, `${label} still renders a page-level ::after overlay.`);
}

async function validateKeyboardFocus(page, label) {
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const element = document.activeElement;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      visible: rect.width > 0 && rect.height > 0,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow
    };
  });

  assert(focused?.visible, `${label} keyboard focus is not visible.`);
  assert(
    focused.outlineStyle !== "none" || focused.boxShadow !== "none" || focused.outlineWidth !== "0px",
    `${label} focused control has no visible focus treatment.`
  );
}

async function validateHome(page, viewportName) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await captureFullPage(page, viewportName, "home");
  await validateNoOverflow(page, `${viewportName} home`);
  await validateLayering(page, `${viewportName} home`);

  const hero = page.locator(".space-hero").first();
  await validateSurfaceTone(page, hero, `${viewportName} home hero`, "dark");
  await measureContrast(page.locator('[data-contrast="hero-paragraph"]').first(), `${viewportName} hero paragraph`);
  await measureContrast(page.locator('[data-contrast="hero-stat-label"]').first(), `${viewportName} hero stat label`);
  await measureContrast(page.getByRole("link", { name: /search the graph/i }).first(), `${viewportName} hero action`, { min: 3 });

  const firstPost = page.locator("article").first();
  await firstPost.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await validateSurfaceTone(page, firstPost, `${viewportName} first post`, "light");
  await measureContrast(firstPost.locator('[data-contrast="post-text"]').first(), `${viewportName} post text`);
  await measureContrast(firstPost.locator('[data-contrast="post-metadata"]').first(), `${viewportName} post metadata`);
  await measureContrast(firstPost.locator('[data-contrast="post-tag"]').first(), `${viewportName} post tag`, { min: 3 });
  await measureContrast(firstPost.locator('[data-contrast="reply-placeholder"]').first(), `${viewportName} reply placeholder`, {
    pseudo: "::placeholder"
  });
  await measureContrast(firstPost.locator('[data-contrast="action-button"]').first(), `${viewportName} share button`, { min: 3 });

  const showThread = firstPost.getByRole("button", { name: /show thread|hide thread/i }).first();
  if (await showThread.isVisible().catch(() => false)) {
    await showThread.click();
    await page.waitForTimeout(250);
  }
  await captureFullPage(page, viewportName, "thread");
  await validateKeyboardFocus(page, `${viewportName} home`);

  const authButton = page.getByRole("button", { name: /continue with google/i });
  if (["desktop", "wide-desktop"].includes(viewportName) && (await authButton.isVisible().catch(() => false))) {
    await authButton.click();
    await page.waitForTimeout(1500);
    const currentUrl = page.url();
    const authError = await page.getByText(/add supabase env vars/i).isVisible().catch(() => false);
    if (!(authError && isLocalBase)) {
      assert(!authError, `${viewportName} Google auth is not configured.`);
      assert(
        currentUrl.includes("accounts.google.com") || currentUrl.includes("/auth/v1/authorize") || currentUrl.includes("google"),
        `${viewportName} Google auth did not redirect to an OAuth entrypoint.`
      );
    }
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
  }

  const likeStatus = await page.evaluate(async (origin) => {
    const response = await fetch(`${origin}/api/posts/00000000-0000-4000-8000-000000001001/like`, { method: "POST" });
    return response.status;
  }, baseUrl);
  assert([401, 503].includes(likeStatus), `${viewportName} unauthenticated like returned ${likeStatus} instead of 401/503.`);
}

async function validateSearch(page, viewportName) {
  await page.goto(`${baseUrl}/search?q=tool`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await captureFullPage(page, viewportName, "search");
  await validateNoOverflow(page, `${viewportName} search`);
  await validateLayering(page, `${viewportName} search`);

  const banner = page.locator(".space-banner").first();
  await validateSurfaceTone(page, banner, `${viewportName} search banner`, "dark");
  await measureContrast(page.locator('[data-contrast="search-placeholder"]').first(), `${viewportName} search placeholder`, {
    pseudo: "::placeholder"
  });

  const searchControls = page.locator("form").first();
  await validateSurfaceTone(page, searchControls, `${viewportName} search controls`, "light");

  const resultsPanel = page.locator(".space-window").nth(1);
  await validateSurfaceTone(page, resultsPanel, `${viewportName} search results`, "light");
  const rightRailSecondary = page.locator('[data-contrast="right-rail-secondary"]').first();
  if ((await rightRailSecondary.count()) > 0 && (await rightRailSecondary.isVisible().catch(() => false))) {
    await measureContrast(rightRailSecondary, `${viewportName} right rail secondary`);
  }
}

async function validateProfile(page, viewportName) {
  await page.goto(`${baseUrl}/agent/atlas`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await captureFullPage(page, viewportName, "agent-atlas");
  await validateNoOverflow(page, `${viewportName} profile`);
  await validateLayering(page, `${viewportName} profile`);

  const banner = page.locator(".space-banner").first();
  await validateSurfaceTone(page, banner, `${viewportName} profile banner`, "dark");
  await measureContrast(page.locator('[data-contrast="agent-status-note"]').first(), `${viewportName} agent status note`);
  await measureContrast(page.getByRole("link", { name: /back to feed/i }).first(), `${viewportName} profile back link`, {
    min: 3
  });

  const firstInfoCard = page.locator(".space-window").filter({ has: page.getByText("Tools") }).first();
  await validateSurfaceTone(page, firstInfoCard, `${viewportName} profile info card`, "light");

  const shareButton = page.getByRole("button", { name: /^share$/i }).first();
  if (await shareButton.isVisible().catch(() => false)) {
    await shareButton.click();
    await page.waitForTimeout(200);
  }

  const followStatus = await page.evaluate(async (origin) => {
    const response = await fetch(`${origin}/api/agents/atlas/follow`, { method: "POST" });
    return response.status;
  }, baseUrl);
  assert([401, 503].includes(followStatus), `${viewportName} unauthenticated follow returned ${followStatus} instead of 401/503.`);
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
      if (isLocalBase && /Failed to load resource: the server responded with a status of 503/i.test(text)) return;
      if (/Failed to load resource: the server responded with a status of 404/i.test(text)) return;
      consoleErrors.push(text);
    });
    page.on("requestfailed", (request) => {
      const url = request.url();
      if (url.includes("_rsc=")) return;
      if (isLocalBase && url.includes("/_vercel/speed-insights/script.js")) return;
      if (isLocalBase && request.method() === "POST" && /\/api\/(posts|agents)\//.test(url)) return;
      failedRequests.push(`${request.method()} ${url} :: ${request.failure()?.errorText ?? "failed"}`);
    });
    page.on("response", (response) => {
      const url = response.url();
      if (!url.startsWith(baseUrl)) return;
      const status = response.status();
      const method = response.request().method();
      if (url.includes("_rsc=")) return;
      if (isLocalBase && url.includes("/_vercel/speed-insights/script.js")) return;
      if (status >= 400 && !(status === 401 && method === "POST") && !(isLocalBase && status === 503 && method === "POST")) {
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

    if (consoleErrors.length) failures.push(`${viewport.name}: console errors -> ${consoleErrors.join(" | ")}`);
    if (failedRequests.length) failures.push(`${viewport.name}: request failures -> ${failedRequests.join(" | ")}`);
    if (httpFailures.length) failures.push(`${viewport.name}: http failures -> ${httpFailures.join(" | ")}`);

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
  console.error(
    JSON.stringify(
      {
        ok: false,
        baseUrl,
        artifactDir,
        failures,
        summary
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      baseUrl,
      artifactDir,
      summary
    },
    null,
    2
  )
);
