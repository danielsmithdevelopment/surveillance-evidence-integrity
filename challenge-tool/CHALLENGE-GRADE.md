# Challenge-grade capture

**One integrity regime. Three capture classes.**

Challenge the Footage is not only a civilian app. It demonstrates a standard that should apply anywhere someone claims “this recording is what happened”:

| Layer | Actors | Today | Challenge-grade requirement |
|---|---|---|---|
| **Civilian phones** | Public, protesters, personal safety | CTF Evidence app (shipping) | Hash at capture, on-device transcript, 2G-first sync, interrupt honesty, optional **multi-device incident** (multi-angle) |
| **Body-worn cameras** | Police / agencies | Vendor clouds (Axon, etc.) | Same *rules*: hash (or equivalent) before leave-device, mute/dock audit, third-party verifiable export, multi-unit incident correlation |
| **Fixed surveillance** | Cities + vendors (ALPR, CCTV, Flock-like) | Often assertion-only | Hash-at-edge, Merkle/audit log, independent anchor, **mandatory case numbers** on queries |

> If a civilian phone can hash, transcript, and independently verify an encounter, taxpayer-funded cameras have no excuse not to.

## Pitch lines

- **Civilians:** Empowerment and safety — private record, trusted contacts, multi-phone redundancy. Not “surveil your neighbors.”
- **Police / cities:** Accountability and evidentiary quality — procurement language, not a consumer app on officers’ phones.
- **Vendors:** Meet Challenge-grade in contracts, or face FRE 901 / discovery pressure (see docs generator + model legislation in this repo).

## Multi-perspective (incident)

Like multiple body cams on one stop:

- Each device records **independently** (own video, audio, hashes, Whisper transcript).
- Shared **`incidentId`** + coordinated start + heartbeats.
- Peer goes dark → others log `PEER_LOST` (time, device) — honest gap, not silent missing angle.
- Multi-mic transcripts stay **per-device**; later cross-reference = intersection / union / conflicts — never one invented “AI truth.”

Civilian multi-device incidents prove the pattern. Body-cam fleets and fixed cams should use the same incident-correlation and integrity ideas.

## Procurement checklist (body cam / ALPR)

1. Cryptographic commitment (hash) **at or before** media leaves the capture device  
2. Tamper-evident log for start / stop / mute / dock / export  
3. Export a third party can verify without the vendor’s UI as sole oracle  
4. Access control with **case numbers** (especially ALPR queries)  
5. Incident / unit correlation id when multiple devices cover one event  
6. No crypto-wallet UX for end users — anchoring is infrastructure

Aligned docs in this repo: `technical-standards.md`, `model-legislation.md`, `model-contract-language.md`, `authentication-challenge-guide.md`, [`FOOTAGE-CHALLENGE.md`](./FOOTAGE-CHALLENGE.md).

## Legal pressure (all three layers)

Empowerment without pressure is incomplete. Full operator guide + precedents: [`FOOTAGE-CHALLENGE.md`](./FOOTAGE-CHALLENGE.md).

The docs generator branches on `footageCategory` (+ `bodyCamRecordingStatus` for BWC):

- **Fixed / ALPR** — FRE 901 hash/Merkle/anchor gaps + ALPR error/abuse discovery ([authentication-challenge-guide.md](../authentication-challenge-guide.md))  
- **Body-worn** — **Stage 1** failure-to-record (adverse inference / spoliation) → **Stage 2** authenticity of any file; clawql-surveillance-class bar  
- **Cell phone** — no authenticity presumption without cryptographic proof against AI alteration / silent re-encode; Challenge-grade civilian capture as the floor  

## Build sequence

1. ~~Civilian single-device integrity + rural sync + safety alerts~~  
2. ~~**Civilian multi-device incident MVP** — create/join, start signal, heartbeat, `PEER_LOST`, `incidentId` on packages~~  
3. ~~**Docs generator: body-worn + cellphone challenge modes** (same four vectors as fixed/ALPR)~~  
4. ~~**BWC failure-to-record ratchet** (`bodyCamRecordingStatus`: missing / partial / recorded)~~  
5. ~~**Sourced BWC + cellphone precedents** parallel to Flock FOIA/IJ facts~~  
6. Attorney library: group sessions by `incidentId` + transcript cross-reference UI  
7. Publish Challenge-grade one-pager for city councils / PDs  
8. Push via contracts + model legislation (BWC + ALPR + phone-video authenticity), informed by what phones already do  

## Non-goals (near term)

- Livestream mesh video between phones  
- Installing CTF on department-issued phones as the compliance mechanism  
- Claiming multi-device capture prevents harm — it improves **evidence and awareness**, not rescue
