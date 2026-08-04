# First native deploy (never shipped an app before?)

You already know websites. Native is different in one main way: **you do not host the binary**. Expo’s cloud (**EAS**) builds an `.apk` / `.ipa`; you install it on a phone (or TestFlight / Play).

**Recommended first path: Android preview APK.**  
No $99/year Apple fee, no App Store review. You get a file you can sideload and test safety + sync.

iOS TestFlight is step 2 once Android feels good.

---

## What you need

| Item | Android preview | iOS TestFlight |
|---|---|---|
| Computer with Node 20+ | Yes | Yes |
| [Expo account](https://expo.dev/signup) (free) | Yes | Yes |
| Google account | Optional (Play later) | — |
| [Apple Developer Program](https://developer.apple.com/programs/) (~$99/yr) | — | Yes |
| Physical phone | Android phone | iPhone |
| Live CTF Worker URL | Strongly recommended | Same |

If `challengethefootage.com` is still down, deploy the site first ([challenge-tool/CLOUDFLARE-DEPLOY.md](../challenge-tool/CLOUDFLARE-DEPLOY.md)), or point the app at a Worker you *have* deployed (or local tunnel) via env — see below.

---

## One-time: accounts + project link

On **your** machine (not the cloud agent — you must log into Expo/Apple yourself):

```bash
git clone https://github.com/danielsmithdevelopment/surveillance-evidence-integrity.git
cd surveillance-evidence-integrity/witness
git checkout main
npm install

# Expo CLI for builds
npm i -g eas-cli
eas login          # browser login to expo.dev
eas init           # create/link EAS project; writes real projectId
```

When `eas init` asks, accept linking this app. It should put a real UUID into config (`extra.eas.projectId`).  
If it only sets an env var, add to `app.config.js` / commit the id EAS printed, or export:

```bash
export EAS_PROJECT_ID=your-uuid-here
```

Optional:

```bash
cp .env.example .env
# Edit if your API is not production yet:
# EXPO_PUBLIC_CTF_API=https://your-worker.example
# EXPO_PUBLIC_CTF_WEB=https://your-worker.example
```

For EAS cloud builds, put those overrides in `eas.json` → `build.preview.env` (already defaults to challengethefootage.com).

---

## Path A — Android APK (do this first)

### 1. Build on Expo’s servers

```bash
cd witness
# Optional but good for rural offline Whisper in the binary:
npm run whisper:fetch

eas build --profile preview --platform android
```

First run may ask:

- Generate a **keystore**? → **Yes** (EAS can manage it)
- Package: `com.challengethefootage.evidence` (already set)

Wait 10–20 minutes. Expo dashboard → Builds → download **APK**.

### 2. Install on your Android phone

1. Transfer the APK (Drive, USB, email to yourself).
2. On the phone: allow **Install unknown apps** for Files/Chrome.
3. Open the APK → Install.
4. Open **Challenge the Footage**.

### 3. Smoke test on device

1. Add an emergency contact + short check-in (e.g. 2 minutes) while testing.
2. Pick a situation (e.g. meetup).
3. On Wi‑Fi: **Download speech model** (if not bundled).
4. Record 20 seconds → Stop & secure.
5. Confirm transcript/hash path; on weak data you should see sync-lite style messaging.
6. Open evidence on the website / claim flow when the Worker is live.

You are **not** on the Play Store yet. That’s fine for dogfooding.

---

## Path B — iOS TestFlight (after Android)

### 1. Apple side

1. Enroll in Apple Developer Program (wait for approval if new).
2. [App Store Connect](https://appstoreconnect.apple.com) → create app  
   Bundle ID: `com.challengethefootage.evidence`  
   Name: Challenge the Footage (or similar).
3. Note the **Apple ID / team** you’ll use with EAS.

### 2. Credentials (EAS can generate)

```bash
cd witness
eas build --profile preview --platform ios
```

Follow prompts:

- Log in with Apple ID  
- Let EAS create Distribution Certificate + Provisioning Profile  
- Select your team  

Build finishes → `.ipa` on Expo.

### 3. Submit to TestFlight

```bash
eas submit --platform ios --latest
# or: eas submit --profile production --platform ios
```

In App Store Connect → TestFlight → add **Internal testers** (your Apple ID) → install **TestFlight** app on iPhone → install the build.

First iOS build often fails on signing or bundle ID mismatches — paste the EAS error and we can fix config.

---

## Path C — store production (later)

Only after preview works:

```bash
eas build --profile production --platform android
eas build --profile production --platform ios
eas submit ...
```

Fill `eas.json` → `submit.production.ios.ascAppId` and Play service account when you’re ready. Privacy policy URL (your `/terms.html`) will be required.

---

## Mental model (website vs app)

| Website | This app |
|---|---|
| `wrangler deploy` → URL goes live | `eas build` → binary you install |
| You control the server | Phone OS + Expo + (later) Apple/Google |
| Refresh to update | New build (or OTA updates later — not set up yet) |
| HTTPS certs | Signing keystore / Apple certs (EAS can hold them) |

---

## Common first-time blockers

1. **Expo Go ≠ this app** — Whisper/native modules need an EAS build, not the Expo Go store app.
2. **Site 530** — app calls `EXPO_PUBLIC_CTF_API`; deploy the Worker before expecting sync/claim to work.
3. **iOS “no devices”** — preview internal needs a registered device or TestFlight; use Android APK to learn first.
4. **Whisper missing** — either `npm run whisper:fetch` before build, or download model in-app on Wi‑Fi once.

---

## What to do right now

1. Create free Expo account.  
2. On your laptop: `cd witness && npm i && eas login && eas init`.  
3. Run `eas build --profile preview --platform android`.  
4. Install APK on a phone and record a test.  

When something fails, send the **exact EAS build log error** (or a screenshot of the prompt you’re stuck on) and we’ll unblock the next step.
