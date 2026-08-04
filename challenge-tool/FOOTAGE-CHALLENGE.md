# Challenging all three capture classes

Challenge the Footage applies the **same integrity pressure** to every category of camera evidence:

| Category | Typical systems | Core failure modes | Pressure ask |
|---|---|---|---|
| **Fixed / ALPR** | Flock, Vigilant, municipal CCTV | No hash-at-capture; query abuse; ~10% misreads; vendor-only logs | FRE 901 / 702 exclusion; case-numbered access; Challenge-grade procurement |
| **Body-worn / in-car** | Axon Evidence, Motorola, WatchGuard | Mute/buffer/dock gaps; cloud re-encode; vault as sole oracle | Hash **before leave-device**; tamper-evident activation/mute/export; clawql-surveillance-class verification or exclusion |
| **Cell phone** | iPhone/Android, WhatsApp/iCloud re-exports, officer personal phones | AI edit/deepfake risk; re-encode destroys provenance; selective clips; Riley extraction issues | No authenticity presumption without cryptographic proof; Challenge-grade civilian capture as the floor |

Generator UI: choose **Footage category** first → mode-specific discovery + templates for all four vectors (FRE 901, FRE 702, Fourth Amendment, § 1983).

## Fixed / ALPR (existing)

See [authentication-challenge-guide.md](../authentication-challenge-guide.md) and vendor profiles in the Worker. FOIA-derived Flock logs, IJ wrongful-stop data, and Toka/Haaretz alteration risk remain the backbone.

## Body-worn cameras

**Common data-management issues**

1. **Activation & mute** — the most important seconds may never be recorded; portals rarely prove mute/off with third-party-verifiable logs  
2. **Dock / cloud ingest** — re-wrap/transcode after the camera; integrity breakpoint without a pre-upload hash  
3. **Evidence vault as oracle** — who viewed/exported is asserted by the vendor, not independently checked  
4. **Retention / category delete** — Brady material disappears on a schedule  
5. **AI assist** — transcripts/redactions become the story the jury hears about the video  
6. **Multi-unit gaps** — curated single-angle production when other officers also recorded  

**Pressure**

- Procurement and discovery: require Challenge-grade controls (hash before leave-device, mute/dock/export audit, export a third party can verify) — same class of capability as [clawql-surveillance](https://docs.clawql.com/surveillance)  
- If the vendor cannot produce those proofs → FRE 901(b)(9) exclusion or evidentiary hearing  
- Civil exposure: incomplete body-cam that conceals force is a § 1983 / spoliation problem  

## Cell phone footage

**Common data-management issues**

1. **No capture-time commitment** — consumer cameras do not default to independently verifiable hashes  
2. **Generative AI / editors** — fabricate or alter AV without obvious artifacts  
3. **Share-sheet / WhatsApp / cloud re-export** — new files, new hashes, broken provenance  
4. **Spoofable metadata** — EXIF and filenames are not proof  
5. **Selective clips** — neighbor files on the roll may be exculpatory  
6. **Extraction overbreadth** — Riley; full-device dumps vs targeted production  
7. **Officer personal phones** — outside BWC policy, weak retention/audit  

**Pressure**

- Accusatory phone video should meet or exceed what Challenge-grade civilian capture already does: hash at capture, honest transcript commitment, verifiable package  
- Without cryptographic proof the clip was not AI-altered or silently re-encoded → no reliability presumption; move to exclude under FRE 901 / 702  
- Demand original camera-roll bytes + hash chain of custody, not a chat export  

## Product wiring

- UI + API: `footageCategory` = `fixed_surveillance` | `body_worn` | `cellphone`  
- Logic: `footage-modes.js` + mode-aware `offline-docs.js` / Worker prompts  
- Vision: [CHALLENGE-GRADE.md](./CHALLENGE-GRADE.md)
