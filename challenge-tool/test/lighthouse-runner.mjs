/**
 * Playwright-connected Lighthouse runner.
 * More reliable than lhci's ChromeLauncher in constrained CI sandboxes.
 *
 * Usage: node test/lighthouse-runner.mjs
 * Expects `static/` to already be built.
 */
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import lighthouse from "lighthouse";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "../static");
const outDir = join(fileURLToPath(new URL(".", import.meta.url)), "../.lighthouseci");
const urls = ["/", "/terms.html", "/public-defenders.html"];
const debugPort = 9333;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

function assertScores(lhr, path) {
  const cats = lhr.categories;
  const checks = [
    ["accessibility", 1],
    ["best-practices", 0.9],
    ["seo", 0.9],
  ];
  const failures = [];
  for (const [id, min] of checks) {
    const score = cats[id]?.score;
    if (score == null || score < min) {
      failures.push(`${path} ${id}=${score} (min ${min})`);
    }
  }
  const contrast = lhr.audits["color-contrast"];
  if (contrast && contrast.score !== null && contrast.score < 1) {
    failures.push(`${path} color-contrast failed`);
  }
  const perf = cats.performance?.score;
  if (perf != null && perf < 0.85) {
    console.warn(`WARN ${path} performance=${perf} (budget 0.85)`);
  }
  return failures;
}

function startStaticServer() {
  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    let filePath = join(root, urlPath === "/" ? "index.html" : urlPath);
    filePath = normalize(filePath);
    if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
    createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  if (!existsSync(root)) {
    throw new Error("static/ missing — run npm run build first");
  }

  const server = await startStaticServer();
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch({
    headless: true,
    args: [
      `--remote-debugging-port=${debugPort}`,
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  mkdirSync(outDir, { recursive: true });
  const allFailures = [];

  try {
    // Warm the browser so the debugging endpoint is ready
    const page = await browser.newPage();
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await page.close();

    for (const path of urls) {
      const url = `${origin}${path}`;
      console.log(`Lighthouse → ${url}`);
      const result = await lighthouse(url, {
        port: debugPort,
        output: "json",
        logLevel: "error",
        onlyCategories: ["accessibility", "best-practices", "seo", "performance"],
        formFactor: "desktop",
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
      });
      if (!result?.lhr) throw new Error(`No LHR for ${path}`);
      const outFile = join(outDir, `lhr-${path.replace(/\W+/g, "_") || "home"}.json`);
      writeFileSync(outFile, JSON.stringify(result.lhr, null, 2));
      const a = result.lhr.categories.accessibility?.score;
      const b = result.lhr.categories["best-practices"]?.score;
      const s = result.lhr.categories.seo?.score;
      const p = result.lhr.categories.performance?.score;
      console.log(`  a11y=${a} best-practices=${b} seo=${s} performance=${p}`);
      allFailures.push(...assertScores(result.lhr, path));
    }
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }

  if (allFailures.length) {
    console.error("\nLighthouse budget failures:");
    for (const f of allFailures) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log("\nLighthouse budgets passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
