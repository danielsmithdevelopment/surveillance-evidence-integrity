# Challenging all three capture classes

Challenge the Footage applies the **same integrity pressure** to every category of camera evidence — with **documented precedents and news**, not only abstract gaps.

| Category | Typical systems | Core failure modes | Pressure ask |
|---|---|---|---|
| **Fixed / ALPR** | Flock, Vigilant, municipal CCTV | No hash-at-capture; query abuse; ~10% misreads; vendor-only logs | FRE 901 / 702 exclusion; case-numbered access; Challenge-grade procurement |
| **Body-worn / in-car** | Axon Evidence, Motorola, WatchGuard | Mute/buffer/dock gaps; cloud re-encode; vault as sole oracle | Hash **before leave-device**; tamper-evident activation/mute/export; clawql-surveillance-class verification or exclusion |
| **Cell phone** | iPhone/Android, WhatsApp/Snapchat/iCloud re-exports | AI edit/deepfake risk; re-encode destroys provenance; selective clips | No authenticity presumption without cryptographic proof; Challenge-grade civilian capture as the floor |

Generator UI: choose **Footage category** first → mode-specific discovery + templates. Fact packs live in `footage-modes.js` (injected into offline + gateway generation).

---

## Fixed / ALPR (existing)

See [authentication-challenge-guide.md](../authentication-challenge-guide.md). Backbone includes FOIA-derived Flock logs (haveibeenflocked.com), Institute for Justice wrongful-stop / stalking documentation, Oak Park cancellation, DHS SAVER ALPR survey, and Toka/Haaretz alteration risk.

---

## Body-worn cameras — precedents & reporting

### Statutes & case law

| Authority | What it shows |
|---|---|
| **Colo. Rev. Stat. § 24-31-902(1)(a)(III)**; **People v. Havens, 2025 CO 72** | Failure to activate/unmute → permissive inference that missing footage would have reflected officer misconduct; rebuttable presumption of inadmissibility for unrecorded statements/conduct |
| **50 ILCS 706/10-20, 10-30**; **People v. Tompkins, 2023 IL 127805** | Illinois Officer-Worn Body Camera Act — intentional non-recording is a jury-instruction / weight issue the defense may raise |

### Investigative / news record (activation & custody)

| Source | What it shows |
|---|---|
| **Chicago COPA** — *Report on Non-Compliance with Body-Worn Camera Regulations* (2021) | 186 BWC non-compliance allegations reviewed; **68 sustained** (≈37%), including serious underlying incidents |
| **CBS 2 Chicago** — *Left in the Dark* | CPD’s own data: **tens of thousands** of encounters that policy required to be recorded were never captured; weak discipline |
| **MTN News / KPAX** — Billings, MT (2023 stop) | Officers discussed cameras, **removed a BWC** (recording went dark), turned cameras off around a consent search; prosecutors reviewed **~180** related cases; officer later terminated |
| **Scottsdale city audit** (Axon/Evidence.com) | Former employees still had access (incl. admin); deletions without required documentation; supervisors skipping reviews |
| **NACDL Champion** (Harlan Yu, 2019) | Defense should demand Evidence.com **evidence audit trail** and **device audit trail** with every production |
| **S.D.N.Y. City letters** (Feb. 2022) | NYPD bulk Evidence.com audit-trail production blocked by technical errors; bulk download required pulling every associated video |

### Pressure ratchet (failure to record → authenticity)

Yes — it makes sense, and many agencies **are required** (by policy and increasingly by statute) to activate BWCs for public contacts. The generator supports `bodyCamRecordingStatus`:

| Status | Stage 1 | Stage 2 |
|---|---|---|
| **`missing`** | Duty to record violated; adverse inference / statutory presumption (Havens / Tompkins); limit officer testimony that fills the silence; Brady/spoliation | Any later-produced or other-officer clip still needs FRE 901 hash-before-leave-device + independent verification |
| **`partial`** | Mute / late-activation gaps as Stage 1 | Authenticity of the fragment that remains |
| **`recorded`** | Keep Stage 1 ready if device audit trail shows gaps | FRE 901 / 702 authenticity & completeness of the file |

**Why this ratchets toward full auditability:** if they didn’t record, they face inference/spoliation pressure; if they did, they face authenticity pressure. The only durable answer to *both* stages is Challenge-grade controls (tamper-evident activation/mute/dock logs + hash-before-leave-device + third-party verifiable export — [clawql-surveillance](https://docs.clawql.com/surveillance) class).

### Pressure ask

Procurement + discovery: those Challenge-grade controls. If proofs do not exist → Stage 1 remedies and/or FRE 901(b)(9) exclusion / hearing.

---

## Cell phone footage — precedents & reporting

### Case law & rules work

| Authority | What it shows |
|---|---|
| **Riley v. California, 573 U.S. 373 (2014)** | Cell phones uniquely invasive; constrains warrantless search/extraction when LE offers phone video |
| **State v. Puloka** (King County Super. Ct., Wash., Mar. 29, 2024) | **First widely reported U.S. criminal ruling** excluding **AI-enhanced** cellphone/Snapchat video under Frye + ER 702/403; AI added/removed visual data (NBC News, Apr. 2024); Topaz Labs warned against forensic use |
| **Mendones v. Cushman & Wakefield** (Alameda Super. Ct., Sept. 2025) | Civil case **dismissed with prejudice** after court found deepfake video + other generative-AI-altered exhibits; metadata claimed iPhone 6 capture incompatible with AI explanation (Law.com / The Recorder; EDRM) |
| **Advisory Committee on Evidence Rules** (2024–2026 reports) | Working draft **Rule 901(c)** on generative-AI fabrication / deepfakes (burden-shifting authenticity), held in abeyance while monitoring cases |
| **United States v. Doolin**; **United States v. Reffitt** (D.D.C.) | Bare “might be deepfake” went to **weight** where independent corroboration existed — so demand **affirmative** cryptographic provenance, not speculation alone |

### Pressure ask

Accusatory phone video should meet or exceed Challenge-grade civilian capture: hash at capture, honest transcript commitment, verifiable package. Without proof the clip was not AI-altered or silently re-encoded → FRE 901 / 702 exclusion or limiting instruction. Demand original camera-roll bytes + hash chain of custody, not a chat export.

---

## Product wiring

- UI + API: `footageCategory` = `fixed_surveillance` | `body_worn` | `cellphone`
- Logic: `footage-modes.js` (`BODY_WORN_BASELINE`, `CELLPHONE_PROFILE`) + mode-aware `offline-docs.js` / Worker
- Vision: [CHALLENGE-GRADE.md](./CHALLENGE-GRADE.md)
