/**
 * Challenge the Footage — Cloudflare infrastructure (Pulumi)
 *
 * Owns: KV namespaces, R2 buckets, optional Worker routes / DNS attachment.
 * Does not upload the Worker script or static assets — use Wrangler for that
 * (Vite build + Workers Static Assets + run_worker_first).
 *
 * Flow:
 *   1. pulumi config set cloudflare:accountId …
 *   2. pulumi up
 *   3. npm run sync   → writes bindings into challenge-tool/wrangler.toml
 *   4. cd ../challenge-tool && npm run deploy
 *   5. (optional) enableRoutes=true + zoneId, then pulumi up again
 */
import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";

const config = new pulumi.Config();
const cfConfig = new pulumi.Config("cloudflare");

const accountId =
  config.get("accountId") ||
  cfConfig.get("accountId") ||
  process.env.CLOUDFLARE_ACCOUNT_ID;
if (!accountId) {
  throw new Error(
    "Set accountId: pulumi config set accountId <CLOUDFLARE_ACCOUNT_ID> " +
      "(or cloudflare:accountId / CLOUDFLARE_ACCOUNT_ID)",
  );
}

const workerName = config.get("workerName") || "challenge-the-footage";
const domain = config.get("domain") || "challengethefootage.com";
const zoneId = config.get("zoneId"); // Cloudflare zone id for domain
const enableR2 = config.getBoolean("enableR2") ?? true;
const enableRoutes = config.getBoolean("enableRoutes") ?? false;
const evidenceBucketName = config.get("evidenceBucketName") || "ctf-evidence";
const evidencePreviewBucketName =
  config.get("evidencePreviewBucketName") || "ctf-evidence-preview";

/** Normalize Pulumi/CF ids that may be `accountId/resourceId`. */
function bareId(id: pulumi.Input<string>): pulumi.Output<string> {
  return pulumi.output(id).apply((raw) => {
    const parts = raw.split("/");
    return parts.length > 1 ? parts[parts.length - 1] : raw;
  });
}

const rateLimitKv = new cloudflare.WorkersKvNamespace("rate-limit-kv", {
  accountId,
  title: `${workerName}-rate-limit`,
});

const rateLimitKvPreview = new cloudflare.WorkersKvNamespace(
  "rate-limit-kv-preview",
  {
    accountId,
    title: `${workerName}-rate-limit-preview`,
  },
);

let evidenceBucket: cloudflare.R2Bucket | undefined;
let evidencePreviewBucket: cloudflare.R2Bucket | undefined;

if (enableR2) {
  evidenceBucket = new cloudflare.R2Bucket("evidence", {
    accountId,
    name: evidenceBucketName,
  });
  evidencePreviewBucket = new cloudflare.R2Bucket("evidence-preview", {
    accountId,
    name: evidencePreviewBucketName,
  });
}

/**
 * Routes require the Worker script to already exist (wrangler deploy first).
 * Enable with: pulumi config set enableRoutes true && pulumi config set zoneId …
 */
if (enableRoutes) {
  if (!zoneId) {
    throw new Error(
      "enableRoutes=true requires zoneId: pulumi config set zoneId <ZONE_ID>",
    );
  }
  new cloudflare.WorkersRoute(
    "apex-route",
    {
      zoneId,
      pattern: `${domain}/*`,
      script: workerName,
    },
    { protect: true },
  );
  new cloudflare.WorkersRoute(
    "www-route",
    {
      zoneId,
      pattern: `www.${domain}/*`,
      script: workerName,
    },
    { protect: true },
  );
}

export const accountIdOut = accountId;
export const workerNameOut = workerName;
export const domainOut = domain;
export const rateLimitKvId = bareId(rateLimitKv.id);
export const rateLimitKvPreviewId = bareId(rateLimitKvPreview.id);
export const evidenceBucketNameOut = evidenceBucket
  ? evidenceBucket.name
  : pulumi.output("");
export const evidencePreviewBucketNameOut = evidencePreviewBucket
  ? evidencePreviewBucket.name
  : pulumi.output("");
export const r2Enabled = enableR2;
export const routesEnabled = enableRoutes;
export const syncHint =
  "Run: npm run sync   # writes KV/R2 ids into challenge-tool/wrangler.toml";
