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

| Event | Behavior |
|---|---|
| PR touching `infra/**` | `pulumi preview` (+ PR comment) |
| Push to `main` touching `infra/**` | `pulumi up` → sync `wrangler.toml` → commit bindings if changed |
| Actions → “Infra (Pulumi)” → Run workflow | Manual `preview` or `up` |

### Repo secrets

| Name | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API (KV + R2 + Routes Edit) |
| `PULUMI_ACCESS_TOKEN` | [Pulumi Cloud](https://app.pulumi.com) access token |

### Repo variables

| Name | Purpose | Example |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | **Required** account id | `…` |
| `PULUMI_STACK` | Stack name | `prod` (default) |
| `CTF_DOMAIN` | Apex domain | `challengethefootage.com` |
| `PULUMI_ENABLE_R2` | Create R2 buckets | `true` (default) |
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
| Pulumi backend | Pulumi Cloud (free) or `pulumi login --local` |

```bash
export CLOUDFLARE_API_TOKEN=…          # required
# optional if not using pulumi config:
export CLOUDFLARE_ACCOUNT_ID=…
```

---

## One-time setup

```bash
cd infra
npm install
pulumi login                  # or: pulumi login --local
pulumi stack init prod        # or preview / staging

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
