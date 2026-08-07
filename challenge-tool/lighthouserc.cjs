module.exports = {
  ci: {
    collect: {
      staticDistDir: "./static",
      url: ["/", "/evidence.html", "/terms.html", "/public-defenders.html", "/media.html"],
      numberOfRuns: 1,
      chromePath: process.env.CHROME_PATH || undefined,
      chromeFlags: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--headless=new",
        "--disable-software-rasterizer",
      ],
      settings: {
        preset: "desktop",
        formFactor: "desktop",
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        // Skip PWA / HTTPS noise on static localhost collect
        onlyCategories: ["accessibility", "best-practices", "seo", "performance"],
        throttlingMethod: "devtools",
        throttling: {
          rttMs: 40,
          throughputKbps: 10 * 1024,
          requestLatencyMs: 0,
          downloadThroughputKbps: 10 * 1024,
          uploadThroughputKbps: 10 * 1024,
          cpuSlowdownMultiplier: 1,
        },
      },
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 1 }],
        "categories:performance": ["error", { minScore: 0.9 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 4000 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "color-contrast": ["error", { minScore: 1 }],
        // Local static collect is HTTP — don't fail CI on that
        "is-on-https": "off",
        "redirects-http": "off",
        "bf-cache": "off",
        "uses-http2": "off",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci",
    },
  },
};
