import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const baseUrl = (process.env.BASE_URL || "https://openchat-agents.vercel.app").replace(/\/+$/, "");
const executablePath = process.env.CHROME_EXECUTABLE_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const artifactDir = path.join(process.cwd(), "tmp", "final-delta");
fs.mkdirSync(artifactDir, { recursive: true });

const viewports = [
  { name: "tiny-mobile", width: 320, height: 740 },
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "small-desktop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide-desktop", width: 1920, height: 1080 }
];

const forbiddenSvgText = [
  "root cause",
  "patch plan",
  "reference notes",
  "top recommendation",
  "repeated evidence fields"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function screenshotLocator(locator, fileName) {
  const filePath = path.join(artifactDir, fileName);
  await locator.screenshot({ path: filePath, animations: "disabled", timeout: 120000 });
  return filePath;
}

async function measureElementContrast(locator, label) {
  const result = await locator.first().evaluate((element) => {
    function parseColor(input) {
      if (!input) return null;
      const rgbaMatch = input.match(/rgba?\(([^)]+)\)/i);
      if (rgbaMatch) {
        const parts = rgbaMatch[1].split(",").map((part) => part.trim());
        if (parts.length < 3) return null;
        return [
          Number(parts[0]),
          Number(parts[1]),
          Number(parts[2]),
          parts[3] == null ? 1 : Number(parts[3])
        ];
      }

      const hexMatch = input.match(/^#([0-9a-f]{3,8})$/i);
      if (!hexMatch) return null;
      const raw = hexMatch[1];
      if (raw.length === 3) return raw.split("").map((char) => Number.parseInt(char + char, 16)).concat(1);
      if (raw.length === 6) return [0, 2, 4].map((index) => Number.parseInt(raw.slice(index, index + 2), 16)).concat(1);
      if (raw.length === 8) {
        return [
          Number.parseInt(raw.slice(0, 2), 16),
          Number.parseInt(raw.slice(2, 4), 16),
          Number.parseInt(raw.slice(4, 6), 16),
          Number.parseInt(raw.slice(6, 8), 16) / 255
        ];
      }
      return null;
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

    let current = element;
    const layers = [];
    while (current) {
      const style = getComputedStyle(current);
      const background = parseColor(style.backgroundColor);
      if (background && background[3] > 0) layers.push(background);
      current = current.parentElement;
    }

    let resolvedBackground = [255, 255, 255, 1];
    for (let index = layers.length - 1; index >= 0; index -= 1) {
      resolvedBackground = composite(layers[index], resolvedBackground);
    }

    const style = getComputedStyle(element);
    const foreground = parseColor(style.color);
    if (!foreground) return null;

    return {
      ratio: contrastRatio(foreground, resolvedBackground),
      foreground: foreground.slice(0, 3),
      background: resolvedBackground.slice(0, 3)
    };
  });

  assert(result, `${label} contrast could not be measured.`);
  assert(result.ratio >= 4.5, `${label} contrast failed: ${result.ratio}`);
  return result;
}

async function validatePanel(locator, label) {
  const report = await locator.first().evaluate((element) => {
    const descendants = [element, ...element.querySelectorAll("*")];
    const visibleTextNodes = descendants.filter((node) => {
      const text = (node.textContent || "").trim();
      if (!text) return false;
      const style = getComputedStyle(node);
      return style.display !== "none" && style.visibility !== "hidden";
    });

    const fontSizes = visibleTextNodes.map((node) => Number.parseFloat(getComputedStyle(node).fontSize)).filter((value) => Number.isFinite(value));

    return {
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      textCount: visibleTextNodes.length,
      minFontSize: fontSizes.length ? Math.min(...fontSizes) : null
    };
  });

  assert(report.textCount > 0, `${label} rendered no text.`);
  assert(report.scrollWidth <= report.clientWidth + 1, `${label} has horizontal overflow.`);
  assert(report.scrollHeight <= report.clientHeight + 1, `${label} has vertical clipping.`);
  assert(report.minFontSize == null || report.minFontSize >= 12, `${label} font size fell below 12px.`);
  return report;
}

async function validateNoOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  assert(overflow.scrollWidth <= overflow.clientWidth + 1, `${label} has horizontal overflow.`);
}

async function readSvgText(route) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "load", timeout: 120000 });
    return await page.evaluate(() =>
      Array.from(document.querySelectorAll("text"))
        .map((node) => (node.textContent || "").trim())
        .filter(Boolean)
    );
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({
  headless: true,
  executablePath
});

try {
  const buildmateSvgText = await readSvgText("/artifacts/buildmate-ci-chart.svg");
  const atlasSvgText = await readSvgText("/artifacts/atlas-research-board.svg");

  const combinedSvgText = [...buildmateSvgText, ...atlasSvgText].join(" ").toLowerCase();
  for (const phrase of forbiddenSvgText) {
    assert(!combinedSvgText.includes(phrase), `Forbidden SVG text still present: ${phrase}`);
  }

  const result = {
    ok: true,
    baseUrl,
    artifactDir,
    svgText: {
      buildmate: buildmateSvgText,
      atlas: atlasSvgText
    },
    contrast: {},
    panels: {},
    screenshots: {}
  };

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    try {
      await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 120000 });
      await validateNoOverflow(page, `${viewport.name} home`);

      const buildmateCard = page.locator('[data-artifact="buildmate-artifact"]').first();
      await buildmateCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);

      const atlasCard = page.locator('[data-artifact="atlas-artifact"]').first();
      await atlasCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);

      const buildmateChart = page.locator('[data-artifact-panel="buildmate-artifact-visual"]').first();
      const buildmateRootCause = page.locator('[data-artifact-panel="buildmate-root-cause"]').first();
      const buildmatePatchPlan = page.locator('[data-artifact-panel="buildmate-patch-plan"]').first();
      const atlasVisual = page.locator('[data-artifact-panel="atlas-artifact-visual"]').first();
      const atlasFields = page.locator('[data-artifact-panel="atlas-evidence-fields"]').first();
      const atlasReference = page.locator('[data-artifact-panel="atlas-reference-notes"]').first();
      const atlasRecommendation = page.locator('[data-artifact-panel="atlas-top-recommendation"]').first();

      result.panels[viewport.name] = {
        buildmateRootCause: await validatePanel(buildmateRootCause, `${viewport.name} BuildMate root cause`),
        buildmatePatchPlan: await validatePanel(buildmatePatchPlan, `${viewport.name} BuildMate patch plan`),
        atlasFields: await validatePanel(atlasFields, `${viewport.name} Atlas repeated evidence fields`),
        atlasReference: await validatePanel(atlasReference, `${viewport.name} Atlas reference notes`),
        atlasRecommendation: await validatePanel(atlasRecommendation, `${viewport.name} Atlas top recommendation`)
      };

      result.contrast[viewport.name] = {
        buildmateRootCauseHeading: await measureElementContrast(buildmateRootCause.getByRole("heading", { name: "Root cause" }), `${viewport.name} BuildMate root cause heading`),
        buildmateRootCauseBody: await measureElementContrast(buildmateRootCause.locator("p").first(), `${viewport.name} BuildMate root cause body`),
        buildmatePatchHeading: await measureElementContrast(buildmatePatchPlan.getByRole("heading", { name: "Patch plan" }), `${viewport.name} BuildMate patch plan heading`),
        buildmatePatchBody: await measureElementContrast(buildmatePatchPlan.locator("p").first(), `${viewport.name} BuildMate patch plan body`),
        atlasReferenceHeading: await measureElementContrast(atlasReference.getByRole("heading", { name: "Reference notes" }), `${viewport.name} Atlas reference notes heading`),
        atlasReferenceBody: await measureElementContrast(atlasReference.locator("p").first(), `${viewport.name} Atlas reference notes body`),
        atlasRecommendationHeading: await measureElementContrast(atlasRecommendation.getByRole("heading", { name: "Top recommendation" }), `${viewport.name} Atlas top recommendation heading`),
        atlasRecommendationBody: await measureElementContrast(atlasRecommendation.locator("p").first(), `${viewport.name} Atlas top recommendation body`)
      };

      if (viewport.name === "desktop" || viewport.name === "tiny-mobile") {
        result.screenshots[`${viewport.name}-buildmate-chart`] = await screenshotLocator(buildmateChart, `${viewport.name}-buildmate-chart.png`);
        result.screenshots[`${viewport.name}-buildmate-root-cause`] = await screenshotLocator(buildmateRootCause, `${viewport.name}-buildmate-root-cause.png`);
        result.screenshots[`${viewport.name}-buildmate-patch-plan`] = await screenshotLocator(buildmatePatchPlan, `${viewport.name}-buildmate-patch-plan.png`);
        result.screenshots[`${viewport.name}-atlas-route-map`] = await screenshotLocator(atlasVisual, `${viewport.name}-atlas-route-map.png`);
        result.screenshots[`${viewport.name}-atlas-reference-notes`] = await screenshotLocator(atlasReference, `${viewport.name}-atlas-reference-notes.png`);
        result.screenshots[`${viewport.name}-atlas-top-recommendation`] = await screenshotLocator(atlasRecommendation, `${viewport.name}-atlas-top-recommendation.png`);
      }
    } finally {
      await page.close();
    }
  }

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
