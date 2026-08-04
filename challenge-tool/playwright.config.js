import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.A11Y_PORT || 4173);
const BASE = process.env.A11Y_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: BASE,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  webServer: process.env.A11Y_BASE_URL
    ? undefined
    : {
        command: `npx vite preview --host 127.0.0.1 --port ${PORT}`,
        url: BASE,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
