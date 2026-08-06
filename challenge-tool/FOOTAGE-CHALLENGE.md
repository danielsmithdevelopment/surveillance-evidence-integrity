# Challenging all three capture classes

**Canonical guide** for Challenge the Footage’s legal-pressure path: fixed/ALPR, body-worn, and cell phone video.

Empowerment (civilian capture) without pressure (court challenges + procurement) is incomplete. This product does both:

1. **Record** Challenge-grade evidence on phones (`witness/` + evidence APIs)  
2. **Challenge** every camera class with the same four legal vectors — backed by real precedents  

| Category | Typical systems | Core failure modes | Pressure ask |
|---|---|---|---|
| **Fixed / ALPR** | Flock, Vigilant, municipal CCTV | No hash-at-capture; query abuse; ~10% misreads; vendor-only logs | FRE 901 / 702 exclusion; case-numbered access; Challenge-grade procurement |
| **Body-worn / in-car** | Axon Evidence, Motorola, WatchGuard | Failure to activate; mute/buffer/dock gaps; cloud re-encode; vault as sole oracle | Stage 1 duty-to-record remedies → Stage 2 authenticity; clawql-surveillance-class controls |
| **Cell phone** | iPhone/Android, WhatsApp/Snapchat/iCloud re-exports | AI edit/deepfake risk; re-encode destroys provenance; selective clips | No authenticity presumption without cryptographic proof; Challenge-grade civilian capture as the floor |

Related: [PRODUCT.md](./PRODUCT.md) (full current product specification) · [CHALLENGE-GRADE.md](./CHALLENGE-GRADE.md) (integrity vision) · [CLOUDFLARE-DEPLOY.md](./CLOUDFLARE-DEPLOY.md) · [authentication-challenge-guide.md](../authentication-challenge-guide.md) (Flock deep-dive)

---

## How to use the generator

1. Open [challengethefootage.com](https://challengethefootage.com/) (docs UI) and sign in.  
2. Choose **Footage category**: Fixed / ALPR · Body-worn · Cell phone.  
3. If **Body-worn**, choose **Body-cam recording status**:
   - **No usable recording** — Stage 1 primary (failure to record)  
   - **Partial / mute gaps** — Stage 1 for gaps + Stage 2 on the fragment  
   - **Recording exists** — Stage 2 authenticity; Stage 1 ready if logs show gaps  
4. Pick vendor/source, case caption fields, and facts.  
5. Generate four attorney-review templates (same vectors every time):

| Doc key | Vector |
|---|---|
| `motion` | FRE 901 authentication (or adverse inference when BWC is missing) |
| `accuracy` | FRE 702 / Daubert reliability |
| `access` | Fourth Amendment / Brady / custody |
| `civil` | 42 U.S.C. § 1983 demand letter |

**API:** `POST /api/generate` with:

```json
{
  "tosAccepted": true,
  "footageCategory": "body_worn",
  "bodyCamRecordingStatus": "missing",
  "vendor": "axon",
  "caseNumber": "…",
  "defendant": "…",
  "court": "…",
  "jurisdiction": "…",
  "cameraType": "Axon Body 3",
  "searchFacts": "Officer never activated during the takedown.",
  "civilHarm": "…"
}
```

| Field | Values |
|---|---|
| `footageCategory` | `fixed_surveillance` (default) · `body_worn` · `cellphone` |
| `bodyCamRecordingStatus` | `missing` · `partial` · `recorded` (body_worn only; ignored otherwise) |
| `vendor` | `flock` · `axon` · `motorola` · `genetec` · `verkada` · `cellphone` · `custom` |

Offline / CI templates: `offline-docs.js`. Live prompts: `worker.js`. Fact packs: `footage-modes.js`.

---

## Fixed / ALPR

See [authentication-challenge-guide.md](../authentication-challenge-guide.md).

Backbone: FOIA-derived Flock logs ([haveibeenflocked.com](https://haveibeenflocked.com)), Institute for Justice wrongful-stop / stalking documentation, Oak Park cancellation, DHS SAVER ALPR survey, Toka/Haaretz alteration risk, 404 Media’s August 2026 Flock series (interstate travel-pattern pretext stops; Wapello County “DO NOT MENTION ALPR USAGE” SOP; FBI/DOJ “as vague as permissible” guidance; traffic-enforcement mission creep), and the *Carpenter* → *Smith* (geofence) → Reeves tower-dump (S.D. Miss. Aug. 5, 2026) line for warrantless ALPR dragnet arguments.

---

## Body-worn cameras

### Why failure-to-record is Stage 1

Agencies typically **require** activation for public contacts (department policy; increasingly statute). When there is **no** recording:

1. Challenge the **absence** — adverse inference, presumption of inadmissibility, limit testimony that fills the silence, Brady/spoliation, compel **device audit trails**.  
2. Then challenge **authenticity** of any later-produced or other-officer clip (FRE 901).  

That ratchet pushes vendors/agencies toward **full auditability**: if they don’t record they lose Stage 1; if they do they must survive Stage 2. Only Challenge-grade controls answer both.

### Recording status → template posture

| `bodyCamRecordingStatus` | Stage 1 | Stage 2 |
|---|---|---|
| **`missing`** (UI default when Body cam selected) | Duty violated; Havens / Tompkins-style remedies; spoliation discovery | Any clip still offered needs hash-before-leave-device + independent verification |
| **`partial`** | Mute / late-activation gaps | Authenticity of the fragment |
| **`recorded`** | Keep Stage 1 ready if activation logs show gaps | FRE 901 / 702 of the produced file |

### Statutes & case law

| Authority | What it shows |
|---|---|
| **Colo. Rev. Stat. § 24-31-902(1)(a)(III)**; **People v. Havens, 2025 CO 72** | Failure to activate/unmute → permissive inference that missing footage would have reflected officer misconduct; rebuttable presumption of inadmissibility for unrecorded statements/conduct |
| **50 ILCS 706/10-20, 10-30**; **People v. Tompkins, 2023 IL 127805** | Illinois Officer-Worn Body Camera Act — intentional non-recording is a jury-instruction / weight issue the defense may raise |

### Investigative / news record

| Source | What it shows |
|---|---|
| **Chicago COPA** — *Report on Non-Compliance with Body-Worn Camera Regulations* (2021) | 186 BWC non-compliance allegations reviewed; **68 sustained** (≈37%), including serious underlying incidents |
| **CBS 2 Chicago** — *Left in the Dark* | CPD’s own data: **tens of thousands** of encounters that policy required to be recorded were never captured; weak discipline |
| **MTN News / KPAX** — Billings, MT (2023 stop) | Officers discussed cameras, **removed a BWC** (recording went dark), turned cameras off around a consent search; prosecutors reviewed **~180** related cases; officer later terminated |
| **Scottsdale city audit** (Axon/Evidence.com) | Former employees still had access (incl. admin); deletions without required documentation; supervisors skipping reviews |
| **NACDL Champion** (Harlan Yu, 2019) | Demand Evidence.com **evidence audit trail** and **device audit trail** with every production |
| **S.D.N.Y. City letters** (Feb. 2022) | NYPD bulk Evidence.com audit-trail production blocked by technical errors; bulk download required pulling every associated video |

### Pressure ask (BWC)

Procurement + discovery: hash **before leave-device**, tamper-evident activation/mute/dock/export logs, export a third party can verify without the vendor portal as sole oracle ([clawql-surveillance](https://docs.clawql.com/surveillance) class). Missing those proofs → Stage 1 remedies and/or FRE 901(b)(9) exclusion.

---

## Cell phone footage

### Case law & rules work

| Authority | What it shows |
|---|---|
| **Riley v. California, 573 U.S. 373 (2014)** | Cell phones uniquely invasive; constrains warrantless search/extraction when LE offers phone video |
| **State v. Puloka** (King County Super. Ct., Wash., Mar. 29, 2024) | **First widely reported U.S. criminal ruling** excluding **AI-enhanced** cellphone/Snapchat video under Frye + ER 702/403; AI added/removed visual data (NBC News, Apr. 2024); Topaz Labs warned against forensic use |
| **Mendones v. Cushman & Wakefield** (Alameda Super. Ct., Sept. 2025) | Civil case **dismissed with prejudice** after court found deepfake video + other generative-AI-altered exhibits; metadata claimed iPhone 6 capture incompatible with AI explanation (Law.com / The Recorder; EDRM) |
| **Advisory Committee on Evidence Rules** (2024–2026 reports) | Working draft **Rule 901(c)** on generative-AI fabrication / deepfakes (burden-shifting authenticity), held in abeyance while monitoring cases |
| **United States v. Doolin**; **United States v. Reffitt** (D.D.C.) | Bare “might be deepfake” went to **weight** where independent corroboration existed — demand **affirmative** cryptographic provenance, not speculation alone |

### Pressure ask (phone)

Accusatory phone video should meet or exceed Challenge-grade civilian capture: hash at capture, honest transcript commitment, verifiable package. Without proof the clip was not AI-altered or silently re-encoded → FRE 901 / 702 exclusion or limiting instruction. Demand original camera-roll bytes + hash chain of custody, not a chat export.

---

## Code map

| Path | Role |
|---|---|
| `footage-modes.js` | Categories, `BODY_WORN_BASELINE`, `CELLPHONE_PROFILE`, recording-status helpers, discovery sets |
| `offline-docs.js` | Deterministic four-doc templates (CI / `GENERATION_MODE=offline`) |
| `worker.js` | `/api/generate`, vendor profiles, gateway prompts |
| `src/App.jsx` | Footage category + body-cam recording status UI |
| `test/offline-docs.test.mjs` | Fixed / BWC (incl. missing) / cellphone coverage |
| `public/openapi.json` | API schema |

---

## Disclaimer

Generated documents are **attorney-review starting templates**, not legal advice. Statutes and case law vary by jurisdiction; verify before filing.
