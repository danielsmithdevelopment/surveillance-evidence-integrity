import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Automated WCAG checks via axe-core.
 * Tags cover WCAG 2.0/2.1/2.2 A + AA. Automated tools cannot prove full
 * conformance alone — see challenge-tool/README.md for the manual checklist.
 */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectNoA11yViolations(page, path) {
  await page.goto(path);
  // Dismiss ToS on the generator so the page under test is the main UI.
  if (path === "/" || path.endsWith("index.html")) {
    const checkbox = page.getByRole("checkbox", {
      name: /I have read and agree to the Terms of Service/i,
    });
    if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.check();
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByRole("heading", { name: /Challenge/i })).toBeVisible();
    }
  }

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  const serious = results.violations.filter((v) =>
    ["critical", "serious"].includes(v.impact || "")
  );

  expect(results.violations, formatViolations(results.violations)).toEqual([]);
  expect(serious).toEqual([]);
}

function formatViolations(violations) {
  if (!violations.length) return "no violations";
  return violations
    .map((v) => {
      const nodes = v.nodes.map((n) => `  - ${n.target.join(" ")}: ${n.failureSummary}`).join("\n");
      return `${v.id} [${v.impact}] ${v.help}\n${nodes}`;
    })
    .join("\n\n");
}

test.describe("WCAG axe scans", () => {
  test("home / generator meets WCAG 2.2 AA (axe)", async ({ page }) => {
    await expectNoA11yViolations(page, "/");
  });

  test("ToS modal meets WCAG 2.2 AA (axe)", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("surv_tos_v1"));
    await page.goto("/");
    await expect(page.getByRole("dialog", { name: /Terms of Service/i })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  test("terms page meets WCAG 2.2 AA (axe)", async ({ page }) => {
    await expectNoA11yViolations(page, "/terms.html");
  });

  test("public defenders page meets WCAG 2.2 AA (axe)", async ({ page }) => {
    await expectNoA11yViolations(page, "/public-defenders.html");
  });
});

test.describe("keyboard & landmarks", () => {
  test("skip link moves focus to main content", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("surv_tos_v1", new Date().toISOString());
    });
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: /Skip to main content/i });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("primary nav and main landmarks exist", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("surv_tos_v1", new Date().toISOString());
    });
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });
});
