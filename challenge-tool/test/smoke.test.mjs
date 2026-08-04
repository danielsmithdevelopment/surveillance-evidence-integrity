/**
 * Smoke test: vendor profiles exist and disclaimer builder shape is stable.
 * Does not call ClawQL / Stripe.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const workerSrc = readFileSync(join(root, "worker.js"), "utf8");
const disclaimer = readFileSync(join(root, "document-disclaimer.txt"), "utf8");

describe("challenge-tool artifacts", () => {
  it("worker embeds major vendor keys", () => {
    for (const key of ["flock:", "axon:", "motorola:", "genetec:", "verkada:"]) {
      assert.match(workerSrc, new RegExp(key));
    }
  });

  it("worker exposes required API routes", () => {
    for (const route of ["/api/checkout", "/api/entitlement", "/api/generate", "/api/history"]) {
      assert.match(workerSrc, new RegExp(route.replace("/", "\\/")));
    }
  });

  it("disclaimer names Challenge the Footage", () => {
    assert.match(disclaimer, /Challenge the Footage/);
    assert.match(disclaimer, /NOT LEGAL ADVICE/);
  });

  it("static pages exist", () => {
    for (const f of ["index.html", "terms.html", "public-defenders.html", "frontend.jsx", "styles.css"]) {
      readFileSync(join(root, "static", f));
    }
  });
});
