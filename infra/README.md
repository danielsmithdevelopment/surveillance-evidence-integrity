# Challenge the Footage — Cloudflare infra (Pulumi)

**Pulumi owns:** Workers KV, R2 buckets, optional Worker routes (custom domain).  
**Wrangler owns:** Vite build → Worker script + Static Assets (`run_worker_first`).

This avoids hand-editing `REPLACE_WITH_*` ids in `wrangler.toml` and keeps preview/prod stacks reproducible.

```
infra/ (this folder)          challenge-tool/
  pulumi up  → KV + R2    →   npm run sync  → wrangler.toml bindings
                              npm run deploy → Worker + assets live
  (optional) enableRoutes →   apex + www routes on zone
```

---

## GitHub Actions

Workflow: [`.github/workflows/infra-pulumi.yml`](../.github/workflows/infra-pulumi.yml)

**No Pulumi Cloud.** State is stored in a Cloudflare **R2** bucket via Pulumi’s S3-compatible DIY backend.

| Event | Behavior |
|---|---|
| PR touching `infra/**` | `pulumi preview` |
| Push to `main` touching `infra/**` | `pulumi up` → sync `wrangler.toml` → commit bindings if changed |
| Actions → “Infra (Pulumi)” → Run workflow | Manual `preview` or `up` |

### One-time: state bucket + R2 API token

Chicken/egg: create the state bucket **outside** this stack (dashboard or Wrangler):

```bash
npx wrangler r2 bucket create ctf-pulumi-state
```

Then Cloudflare dashboard → **R2** → **Manage R2 API Tokens** → create a token with Object Read & Write on `ctf-pulumi-state`. That gives you an Access Key ID + Secret Access Key (S3-compatible).

Generate a random passphrase for stack encryption (store only in GitHub Secrets):

```bash
openssl rand -base64 32
```

### Repo secrets

| Name | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API (Workers KV / R2 / Routes) for *provisioning* |
| `PULUMI_STATE_ACCESS_KEY_ID` | R2 API token access key (state backend) |
| `PULUMI_STATE_SECRET_ACCESS_KEY` | R2 API token secret (state backend) |
| `PULUMI_CONFIG_PASSPHRASE` | Encrypts Pulumi stack config/state secrets |

### Repo variables

| Name | Purpose | Example |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | **Required** account id | `…` |
| `PULUMI_STATE_BUCKET` | R2 bucket for state | `ctf-pulumi-state` (default) |
| `PULUMI_STACK` | Stack name | `prod` (default) |
| `CTF_DOMAIN` | Apex domain | `challengethefootage.com` |
| `PULUMI_ENABLE_R2` | Create evidence R2 buckets | `true` (default) |
| `CLOUDFLARE_ZONE_ID` | Zone id (for routes) | from CF dashboard |
| `PULUMI_ENABLE_ROUTES` | Attach Worker routes | `true` only **after** first `wrangler deploy` |

Worker secrets (`GOOGLE_CLIENT_ID`, `CLAWQL_*`) stay on Wrangler — not in this workflow.

```bash
# After Actions syncs wrangler.toml on main:
cd challenge-tool
npm run deploy
```

---

## Prerequisites

| Tool | Notes |
|---|---|
| [Pulumi CLI](https://www.pulumi.com/docs/install/) | `curl -fsSL https://get.pulumi.com \| sh` |
| Node 20+ | |
| Cloudflare API token | Account: Workers KV Write, R2 Write, Workers Routes Edit (if routing) |
| R2 state bucket | DIY backend — **not** Pulumi Cloud (`pulumi login s3://…?endpoint=…r2.cloudflarestorage.com`) |

```bash
export CLOUDFLARE_API_TOKEN=…          # provisioning
export CLOUDFLARE_ACCOUNT_ID=…
export PULUMI_CONFIG_PASSPHRASE=…      # openssl rand -base64 32
export AWS_ACCESS_KEY_ID=…             # R2 API token
export AWS_SECRET_ACCESS_KEY=…
export AWS_DEFAULT_REGION=auto
```

---

## One-time setup (local)

```bash
# Create state bucket once (if not already):
npx wrangler r2 bucket create ctf-pulumi-state

cd infra
npm install

ENDPOINT="https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
pulumi login "s3://ctf-pulumi-state?endpoint=${ENDPOINT}&region=auto&s3ForcePathStyle=true"
pulumi stack init prod

pulumi config set accountId <CLOUDFLARE_ACCOUNT_ID>
# optional:
# pulumi config set workerName challenge-the-footage
# pulumi config set domain challengethefootage.com
# pulumi config set enableR2 true
```

Do **not** put `GOOGLE_CLIENT_ID` / ClawQL keys in Pulumi unless you intentionally manage Worker secrets here. Default path: `wrangler secret put` after deploy (see [CLOUDFLARE-DEPLOY.md](../challenge-tool/CLOUDFLARE-DEPLOY.md)).

---

## Create resources + sync Wrangler

```bash
cd infra
npm run up:sync
# = pulumi up --yes && node scripts/sync-wrangler-bindings.mjs
```

That writes the `# BEGIN PULUMI-MANAGED` … `# END PULUMI-MANAGED` block in `challenge-tool/wrangler.toml`.

Then ship the app:

```bash
cd ../challenge-tool
npm run deploy
# secrets (once):
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put CLAWQL_GATEWAY_URL
npx wrangler secret put CLAWQL_API_KEY
```

---

## Attach custom domain (phase 2)

Routes require the Worker script to already exist.

```bash
cd infra
pulumi config set zoneId <CLOUDFLARE_ZONE_ID>
pulumi config set enableRoutes true
pulumi up
```

Zone id: Cloudflare dashboard → domain → Overview → Zone ID.

---

## Stacks

| Stack | Typical use |
|---|---|
| `prod` | challengethefootage.com |
| `preview` | dogfood / workers.dev only (`enableRoutes false`) |

```bash
STACK=preview npm run sync
```

---

## Destroy

```bash
# disable routes first if attached
pulumi config set enableRoutes false
pulumi up
pulumi destroy
```

R2 buckets with objects may need emptying first.

---

## Why not full Pulumi Worker upload?

Workers Static Assets + `run_worker_first` + local `wrangler dev` are smoother in Wrangler today. Pulumi still templates the durable resources and bindings so deploys are not tribal knowledge.
