import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const baseUrl = (process.env.BASE_URL || "https://openchat-agents.vercel.app").replace(/\/+$/, "");
const executablePath = process.env.CHROME_EXECUTABLE_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const artifactDir = path.join(process.cwd(), "tmp", "final-delta");
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

async function screenshotLocator(locator, fileName) {
  const filePath = path.join(artifactDir, fileName);
  await locator.screenshot({ path: filePath, animations: "disabled" });
  return filePath;
}

async function screenshotPage(page, fileName) {
  const filePath = path.join(artifactDir, fileName);
  await page.screenshot({ path: filePath, fullPage: true, animations: "disabled" });
  return filePath;
}

async function screenshotSvg(page, fileName) {
  const filePath = path.join(artifactDir, fileName);
  await page.locator("svg").first().screenshot({ path: filePath, animations: "disabled", timeout: 120000 });
  return filePath;
}

async function measureElementContrast(locator, label, { pseudo = null } = {}) {
  const result = await locator.first().evaluate(
    (element, options) => {
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
        if (raw.length === 3) {
          return raw.split("").map((char) => Number.parseInt(char + char, 16)).concat(1);
        }
        if (raw.length === 6) {
          return [0, 2, 4].map((index) => Number.parseInt(raw.slice(index, index + 2), 16)).concat(1);
        }
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

      const style = getComputedStyle(element, options?.pseudo ?? undefined);
      const foreground = parseColor(style.color);
      if (!foreground) return null;

      return {
        ratio: contrastRatio(foreground, resolvedBackground),
        foreground: foreground.slice(0, 3),
        background: resolvedBackground.slice(0, 3)
      };
    },
    { pseudo }
  );

  assert(result, `${label} contrast could not be measured.`);
  return result;
}

async function measureSvgReport(page, panelIds, textIds) {
  return page.evaluate(
    ({ panelIds, textIds }) => {
      function parseColor(input) {
        if (!input) return null;
        const rgbaMatch = input.match(/rgba?\(([^)]+)\)/i);
        if (rgbaMatch) {
          const parts = rgbaMatch[1].split(",").map((part) => part.trim());
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

      function resolvedSvgColor(element, attributeName, cssProperty) {
        return parseColor(getComputedStyle(element)[cssProperty]) ?? parseColor(element.getAttribute(attributeName) || "");
      }

      const panels = Object.fromEntries(
        panelIds.map((id) => {
          const element = document.getElementById(id);
          if (!element) return [id, null];
          return [
            id,
            {
              x: Number(element.getAttribute("x") || 0),
              y: Number(element.getAttribute("y") || 0),
              width: Number(element.getAttribute("width") || 0),
              height: Number(element.getAttribute("height") || 0),
              fill: resolvedSvgColor(element, "fill", "fill")
            }
          ];
        })
      );

      return textIds.map(({ id, panelId }) => {
        const element = document.getElementById(id);
        const panel = panels[panelId];
        if (!element || !panel || !panel.fill) {
          return { id, panelId, missing: true };
        }

        const bbox = element.getBBox();
        const fill = resolvedSvgColor(element, "fill", "fill");
        return {
          id,
          panelId,
          contrast: fill ? contrastRatio(fill, panel.fill) : null,
          bbox: {
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height
          },
          withinPanel:
            bbox.x >= panel.x + 18 &&
            bbox.y >= panel.y + 18 &&
            bbox.x + bbox.width <= panel.x + panel.width - 18 &&
            bbox.y + bbox.height <= panel.y + panel.height - 18
        };
      });
    },
    { panelIds, textIds }
  );
}

const browser = await chromium.launch({
  headless: true,
  executablePath
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 120000 });

  const observedPatternSection = page.locator("section").filter({ has: page.getByText("Observed pattern", { exact: true }) }).first();
  const queueSnapshotSection = page.locator("section").filter({ has: page.getByText("Queue snapshot", { exact: true }) }).first();
  const atlasToolSection = page.locator("section").filter({ has: page.getByText("web.run", { exact: true }) }).first();
  const buildmateToolSection = page.locator("section").filter({ has: page.getByText("browser verify", { exact: true }) }).first();
  const schemaSection = page.locator("section").filter({ has: page.getByText("expense_anomaly", { exact: true }) }).first();
  const navRail = page.locator('aside[aria-label="Primary navigation"]').first();

  await observedPatternSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);

  const observedPatternContrast = await measureElementContrast(observedPatternSection.locator("pre").first(), "Observed pattern JSON");
  const queueSnapshotContrast = await measureElementContrast(queueSnapshotSection.locator("pre").first(), "Queue snapshot JSON");
  const atlasToolContrast = await measureElementContrast(atlasToolSection.getByText(/Collected launch notes/i).first(), "Atlas tool output");
  const buildmateToolContrast = await measureElementContrast(buildmateToolSection.getByText(/Confirmed the spinner race/i).first(), "BuildMate tool output");
  const schemaSummaryContrast = await measureElementContrast(schemaSection.getByText(/Classification used for finance alerts/i).first(), "Schema summary");
  const schemaFieldContrast = await measureElementContrast(schemaSection.getByText("recommended_action", { exact: true }).first(), "Schema field");

  assert(observedPatternContrast.ratio >= 4.5, `Observed pattern contrast failed: ${observedPatternContrast.ratio}`);
  assert(queueSnapshotContrast.ratio >= 4.5, `Queue snapshot contrast failed: ${queueSnapshotContrast.ratio}`);
  assert(atlasToolContrast.ratio >= 4.5, `Atlas tool output contrast failed: ${atlasToolContrast.ratio}`);
  assert(buildmateToolContrast.ratio >= 4.5, `BuildMate tool output contrast failed: ${buildmateToolContrast.ratio}`);
  assert(schemaSummaryContrast.ratio >= 4.5, `Schema summary contrast failed: ${schemaSummaryContrast.ratio}`);
  assert(schemaFieldContrast.ratio >= 4.5, `Schema field contrast failed: ${schemaFieldContrast.ratio}`);

  const logoGeometry = await navRail.evaluate(() => {
    const mark = document.querySelector("a > span");
    const svg = mark?.querySelector("svg");
    if (!mark || !svg) return null;
    const markRect = mark.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    return {
      markWidth: markRect.width,
      markHeight: markRect.height,
      offsetX: Math.abs(markRect.left + markRect.width / 2 - (svgRect.left + svgRect.width / 2)),
      offsetY: Math.abs(markRect.top + markRect.height / 2 - (svgRect.top + svgRect.height / 2))
    };
  });

  assert(logoGeometry, "Logo geometry could not be measured.");
  assert(logoGeometry.offsetX <= 1 && logoGeometry.offsetY <= 1, `Logo mark is not centered: ${JSON.stringify(logoGeometry)}`);

  const screenshotPaths = {
    observedPattern: await screenshotLocator(observedPatternSection, "observed-pattern-block.png"),
    queueSnapshot: await screenshotLocator(queueSnapshotSection, "queue-snapshot-block.png"),
    atlasTool: await screenshotLocator(atlasToolSection, "atlas-tool-block.png"),
    buildmateTool: await screenshotLocator(buildmateToolSection, "buildmate-tool-block.png"),
    schema: await screenshotLocator(schemaSection, "schema-block.png"),
    logoNav: await screenshotLocator(navRail, "logo-nav-desktop.png")
  };

  const buildmateBounds = [];
  const buildmateScreens = {};
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${baseUrl}/artifacts/buildmate-ci-chart.svg`, { waitUntil: "load", timeout: 120000 });
    buildmateScreens[viewport.name] = await screenshotSvg(page, `buildmate-${viewport.name}.png`);
    const report = await measureSvgReport(
      page,
      ["buildmate-root-cause-panel", "buildmate-patch-plan-panel"],
      [
        { id: "buildmate-root-cause-title", panelId: "buildmate-root-cause-panel" },
        { id: "buildmate-root-cause-1", panelId: "buildmate-root-cause-panel" },
        { id: "buildmate-root-cause-2", panelId: "buildmate-root-cause-panel" },
        { id: "buildmate-patch-plan-title", panelId: "buildmate-patch-plan-panel" },
        { id: "buildmate-patch-plan-1", panelId: "buildmate-patch-plan-panel" },
        { id: "buildmate-patch-plan-2", panelId: "buildmate-patch-plan-panel" },
        { id: "buildmate-patch-plan-3", panelId: "buildmate-patch-plan-panel" }
      ]
    );
    buildmateBounds.push({ viewport: viewport.name, report });
  }

  for (const entry of buildmateBounds) {
    for (const report of entry.report) {
      assert(!report.missing, `Missing BuildMate SVG element ${report.id}`);
      assert(report.withinPanel, `BuildMate SVG element ${report.id} overflowed at ${entry.viewport}`);
      assert(report.contrast != null && report.contrast >= 7, `BuildMate SVG element ${report.id} contrast failed at ${entry.viewport}: ${report.contrast}`);
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/artifacts/atlas-research-board.svg`, { waitUntil: "load", timeout: 120000 });
  const atlasSvgReport = await measureSvgReport(
    page,
    ["atlas-reference-panel"],
    [
      { id: "atlas-reference-title", panelId: "atlas-reference-panel" },
      { id: "atlas-reference-note-1", panelId: "atlas-reference-panel" },
      { id: "atlas-reference-note-2", panelId: "atlas-reference-panel" },
      { id: "atlas-reference-note-3", panelId: "atlas-reference-panel" }
    ]
  );

  for (const report of atlasSvgReport) {
    assert(!report.missing, `Missing Atlas SVG element ${report.id}`);
    assert(report.withinPanel, `Atlas SVG element ${report.id} overflowed`);
    assert(report.contrast != null && report.contrast >= 7, `Atlas SVG element ${report.id} contrast failed: ${report.contrast}`);
  }

  screenshotPaths.atlasReference = await screenshotSvg(page, "atlas-reference-notes.png");

  const result = {
    ok: true,
    baseUrl,
    artifactDir,
    contrast: {
      observedPattern: observedPatternContrast,
      queueSnapshot: queueSnapshotContrast,
      atlasToolOutput: atlasToolContrast,
      buildmateToolOutput: buildmateToolContrast,
      schemaSummary: schemaSummaryContrast,
      schemaField: schemaFieldContrast,
      atlasReferenceNotes: Object.fromEntries(atlasSvgReport.map((item) => [item.id, item.contrast])),
      buildmatePanels: Object.fromEntries(buildmateBounds[0].report.map((item) => [item.id, item.contrast]))
    },
    buildmate: {
      checkedViewports: buildmateBounds.map((item) => item.viewport),
      reports: buildmateBounds,
      screenshots: buildmateScreens
    },
    logo: {
      centered: true,
      geometry: logoGeometry
    },
    screenshots: screenshotPaths
  };

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
