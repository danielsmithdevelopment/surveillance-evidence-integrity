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
    assert.match(workerSrc, /ALLOW_TEST_AUTH/);
    assert.match(workerSrc, /buildOfflineDocs/);
    assert.match(workerSrc, /wantsOfflineGeneration/);
    assert.match(workerSrc, /from "\.\/evidence-crypto\.js"/);
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
      "evidence.html",
      "src/App.jsx",
      "src/EvidencePage.jsx",
      "src/index.css",
      "PRODUCT.md",
    ]) {
      readFileSync(join(root, f));
    }
    for (const f of ["index.html", "terms.html", "public-defenders.html", "evidence.html"]) {
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
      "evidence.md",
      ".well-known/api-catalog",
      ".well-known/agent-card.json",
      ".well-known/mcp/server-card.json",
      ".well-known/agent-skills/index.json",
      ".well-known/oauth-protected-resource",
      ".well-known/oauth-authorization-server",
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
    const oauthAs = JSON.parse(
      readFileSync(join(root, "static", ".well-known/oauth-authorization-server"), "utf8")
    );
    assert.ok(oauthAs.agent_auth?.identity_types_supported?.includes("identity_assertion"));
    assert.match(workerSrc, /AGENT_LINK_HEADER/);
    assert.match(workerSrc, /wantsMarkdown/);
    assert.match(workerSrc, /handleEvidenceSecure/);
    assert.match(workerSrc, /handleEvidenceSecureDevice/);
    assert.match(workerSrc, /handleEvidenceSyncLite/);
    assert.match(workerSrc, /handleEvidenceSafetyPing/);
    assert.match(workerSrc, /handleIncidentCreate/);
    assert.match(workerSrc, /handleEvidenceClaim/);
    assert.match(workerSrc, /handleEvidenceUploadUrl/);
    assert.match(workerSrc, /handleEvidenceObjectPut/);
    readFileSync(join(root, "r2.js"));
    readFileSync(join(root, "evidence-crypto.js"));
    readFileSync(join(root, "evidence-gzip.js"));
    readFileSync(join(root, "incident.js"));
    readFileSync(join(root, "footage-modes.js"));
    readFileSync(join(root, "FOOTAGE-CHALLENGE.md"));
    assert.match(
      readFileSync(join(root, "FOOTAGE-CHALLENGE.md"), "utf8"),
      /bodyCamRecordingStatus/
    );
    readFileSync(join(root, "CHALLENGE-GRADE.md"));
    assert.match(workerSrc, /footageCategory/);
    assert.match(workerSrc, /resolveFootageProfile/);
    readFileSync(join(root, "TESTING.md"));
    assert.match(workerSrc, /oauth-authorization-server/);
    readFileSync(join(root, "src/webmcp.js"));
  });
});
