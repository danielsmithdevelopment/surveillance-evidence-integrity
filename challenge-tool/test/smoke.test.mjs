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

  it("Vite source and built static pages exist", () => {
    for (const f of [
      "index.html",
      "terms.html",
      "public-defenders.html",
      "src/App.jsx",
      "src/index.css",
    ]) {
      readFileSync(join(root, f));
    }
    for (const f of ["index.html", "terms.html", "public-defenders.html"]) {
      readFileSync(join(root, "static", f));
    }
  });

  it("agent-ready discovery files are published into static/", () => {
    for (const f of [
      "robots.txt",
      "sitemap.xml",
      "llms.txt",
      "openapi.json",
      "auth.md",
      "AGENTS.md",
      "index.md",
      ".well-known/api-catalog",
      ".well-known/agent-card.json",
      ".well-known/mcp/server-card.json",
      ".well-known/agent-skills/index.json",
      ".well-known/oauth-protected-resource",
      ".well-known/openid-configuration",
      ".well-known/acp.json",
    ]) {
      readFileSync(join(root, "static", f));
    }
    const card = JSON.parse(
      readFileSync(join(root, "static", ".well-known/agent-card.json"), "utf8")
    );
    assert.ok(Array.isArray(card.supportedInterfaces));
    assert.ok(card.supportedInterfaces.length > 0);
    assert.match(workerSrc, /AGENT_LINK_HEADER/);
    assert.match(workerSrc, /wantsMarkdown/);
  });
});
