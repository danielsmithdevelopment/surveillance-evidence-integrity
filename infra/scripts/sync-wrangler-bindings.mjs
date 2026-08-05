#!/usr/bin/env node
/**
 * Read Pulumi stack outputs and rewrite the PULUMI-MANAGED block in
 * challenge-tool/wrangler.toml (KV ids + optional R2 bindings).
 *
 * Usage (from infra/):
 *   npm run sync
 *   STACK=prod npm run sync
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const infraRoot = join(__dirname, "..");
const wranglerPath = join(infraRoot, "..", "challenge-tool", "wrangler.toml");
const stack = process.env.STACK || process.env.PULUMI_STACK || "";

function pulumiOutputs() {
  const args = ["stack", "output", "--json"];
  if (stack) args.push("--stack", stack);
  const raw = execFileSync("pulumi", args, {
    cwd: infraRoot,
    encoding: "utf8",
    env: process.env,
  });
  return JSON.parse(raw);
}

function managedBlock(out) {
  const kvId = out.rateLimitKvId;
  const kvPreview = out.rateLimitKvPreviewId;
  if (!kvId || !kvPreview) {
    throw new Error(
      "Missing rateLimitKvId / rateLimitKvPreviewId from pulumi stack output. Run pulumi up first.",
    );
  }

  const lines = [
    "# BEGIN PULUMI-MANAGED — do not edit by hand; npm run sync from infra/",
    "[[kv_namespaces]]",
    'binding = "RATE_LIMIT_KV"',
    `id = "${kvId}"`,
    `preview_id = "${kvPreview}"`,
  ];

  if (out.r2Enabled && out.evidenceBucketNameOut) {
    lines.push(
      "",
      "[[r2_buckets]]",
      'binding = "EVIDENCE_BUCKET"',
      `bucket_name = "${out.evidenceBucketNameOut}"`,
    );
    if (out.evidencePreviewBucketNameOut) {
      lines.push(`preview_bucket_name = "${out.evidencePreviewBucketNameOut}"`);
    }
  } else {
    lines.push(
      "",
      "# R2 disabled in this stack (pulumi config set enableR2 false)",
      "# [[r2_buckets]]",
      '# binding = "EVIDENCE_BUCKET"',
      '# bucket_name = "ctf-evidence"',
      '# preview_bucket_name = "ctf-evidence-preview"',
    );
  }

  lines.push("# END PULUMI-MANAGED");
  return lines.join("\n");
}

function main() {
  const out = pulumiOutputs();
  const block = managedBlock(out);
  let toml = readFileSync(wranglerPath, "utf8");

  const begin = "# BEGIN PULUMI-MANAGED";
  const end = "# END PULUMI-MANAGED";
  const startIdx = toml.indexOf(begin);
  const endIdx = toml.indexOf(end);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      `Markers not found in ${wranglerPath}. Expected ${begin} … ${end}`,
    );
  }

  const before = toml.slice(0, startIdx);
  const after = toml.slice(endIdx + end.length);
  const next = `${before}${block}${after.replace(/^\n/, "\n")}`;
  writeFileSync(wranglerPath, next.endsWith("\n") ? next : `${next}\n`);
  console.log(`Updated ${wranglerPath}`);
  console.log(`  RATE_LIMIT_KV id=${out.rateLimitKvId}`);
  if (out.r2Enabled) {
    console.log(`  EVIDENCE_BUCKET=${out.evidenceBucketNameOut}`);
  }
  if (out.routesEnabled) {
    console.log(`  routes enabled for ${out.domainOut}`);
  } else {
    console.log(
      "  routes not enabled yet — after first wrangler deploy: pulumi config set enableRoutes true",
    );
  }
}

main();
