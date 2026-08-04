#!/usr/bin/env node
/**
 * End-to-end sample generation against a running wrangler dev server.
 *
 * Usage:
 *   npm run worker          # terminal 1
 *   npm run generate:sample # terminal 2
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.CTF_BASE || "http://127.0.0.1:8787";
const TOKEN = process.env.CTF_TEST_TOKEN || "test:demo-user-001:demo.attorney@example.com";
const outDir = join(dirname(fileURLToPath(import.meta.url)), "../../.artifacts/sample-generation");

const payload = {
  tosAccepted: true,
  vendor: "flock",
  caseNumber: "24-CR-8841",
  defendant: "Jordan Avery Lee",
  court: "Superior Court of California, County of Alameda",
  jurisdiction: "State of California",
  city: "Oakland",
  cameraType: "Flock Safety ALPR fixed camera — Fruitvale Ave corridor",
  additionalFacts:
    "Stop occurred 2024-11-03 ~21:40 near International Blvd. Officer stated the hit came from a Flock alert. Client's plate is 7XKR492; alert showed 7XK8492.",
  searchFacts:
    "FOIA export for the querying officer shows the 21:38 plate query with blank case-number field.",
  civilHarm:
    "Client detained at gunpoint for approximately 40 minutes, handcuffed, released with no citation. Missed night shift (~$280 wages).",
};

async function main() {
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  console.log("health:", health);

  const ent = await fetch(`${BASE}/api/entitlement`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  console.log("entitlement:", ent.status, ent.body);

  const res = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) {
    console.error("generate failed", res.status, body);
    process.exit(1);
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "meta.json"),
    JSON.stringify({ ...body.meta, sessionId: body.sessionId }, null, 2)
  );
  for (const [key, text] of Object.entries(body.docs)) {
    writeFileSync(join(outDir, `${key}.txt`), text);
    console.log(`${key}: ${text.length} chars`);
  }
  console.log("wrote", outDir);
  console.log("sessionId:", body.sessionId);
  console.log("mode:", body.meta?.generationMode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
