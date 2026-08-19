# Challenge the Footage — One-Pagers

Print-ready versions for city councils / contracting authorities (two jurisdiction framings, same contract ask) and public defenders.  
Aimed at one page each when pasted into a letterhead or Google Doc (11–12 pt body).

**Framing rule:** Lead with the audience’s local risk; ask for the **same** integrity and placement clauses either way. Do not mix political causes in a single council handout.

**Last reviewed:** August 9, 2026 · Aligned with [PRODUCT.md](../challenge-tool/PRODUCT.md)

---

## Version 1A: City Councils — access / accountability framing

*Use where stalking, federal data sharing, and unauthorized queries are the local concern.*

---

**BEFORE YOU RENEW YOUR SURVEILLANCE CAMERA CONTRACT**

**Three things your vendor probably can’t prove — and why that matters.**

Your city contracts with a surveillance camera company. Officers use the footage to make stops. Prosecutors use it as evidence. Defense attorneys are starting to ask a question that no major vendor can currently answer:

*How do you know this footage is what the camera recorded, unaltered?*

---

**The authentication gap**

No major surveillance camera vendor publicly documents:

- Footage hashed inside the camera before it leaves the hardware  
- A tamper-evident record of every time the footage was accessed  
- That record stored somewhere the vendor cannot alter it  

Without these controls, “this is what the camera recorded” is the vendor’s word. It is not independently verifiable. When that gap is challenged under evidence rules, cities inherit the risk — in court and at contract renewal.

---

**The accuracy problem**

The industry operates at a documented plate-character misread rate of approximately 10%. On actionable hot-list alerts that trigger stops — the output officers act on — the LAPD Office of the Inspector General (July 10, 2026) found a **32.3% false positive rate** (161 of 498 alerts) over two months; each false alert led to a stop of an innocent driver under high-risk stop protocol. Many failures were stale hot-list / database records, not OCR misreads — so the reliability unit is cameras + database + alert. Separately, Roseville, California found that in **71%** of 1,427 Flock felony/stolen alerts over two years, the cameras misread the plates (Business Insider / Roseville PD; IJ database). The Institute for Justice Database of ALPR Abuse (published August 12, 2026; 146 source-cited incidents) documents wrongful stops, gunpoint detentions, and jailings from plate misreads and misinterpreted alerts. LAPD allowed its Flock contract to expire rather than renew. A system used to initiate armed stops at a one-in-three false-positive rate is not a defensible legal standard. The appropriate floor is 0.1% or better, independently certified.

---

**The access problem**

Public records data shows that 84% of searches run against the Flock Safety network carried no case number. The Institute for Justice Database of ALPR Abuse (146 source-cited incidents, published August 12, 2026 — the day before Flock announced mandatory “guardrails”) documents stalking, non-law-enforcement personal searches, evidence tampering, and other misuse. Federal agencies have accessed local networks without clear local consent in multiple reported cases. When most searches lack documented justification, unauthorized personal use and unexpected sharing are structurally hard to detect.

---

**What to require in your next contract**

Four clauses. Any vendor who refuses to sign them is telling you something. (Full text: `model-contract-language.md`.)

**1.** Footage must be hashed inside the camera hardware before transmission. The vendor must provide cryptographic proof of this on request, including to defense counsel in any case using the footage as evidence.

**2.** Every query must be logged with a case number. Queries without case numbers must be blocked — not flagged, blocked. The log must be stored in a form the vendor cannot alter after the fact.

**3.** The vendor must not integrate with any system capable of altering footage without leaving a detectable trace in the audit log. Violation is a material breach.

**4.** Location-sensitive collection: ALPR data collected at or near places associated with lawful sensitive activity — including medical, worship, legal-aid, and firearms-related locations — must not be used to build activity lists or share with federal agencies outside a documented investigation of a specific person. Private hosts of cameras at those locations must be able to terminate on notice (`model-contract-language.md` §7).

(Same integrity ideas should apply to **body-worn camera** contracts: hash before leave-device, activation/mute/export logs, export a third party can verify.)

---

**Free resources**

- Clause-ready model contract language:  
  **github.com/danielsmithdevelopment/surveillance-evidence-integrity**  
  → `model-contract-language.md`
- Challenge documents & evidence tool: **challengethefootage.com**
- Public defender access / questions: **pd@challengethefootage.com** · **sponsor@challengethefootage.com**

---

## Version 1B: City Councils — firearms-location / federal bill framing

*Use where ALPR placement near ranges, gun stores, or shows is the local concern. Same contract ask as Version 1A.*

---

**BEFORE YOU RENEW YOUR SURVEILLANCE CAMERA CONTRACT**

**Three things your vendor probably can’t prove — and why that matters.**

Your city contracts with a surveillance camera company. Officers use the footage to make stops. Prosecutors use it as evidence. Defense attorneys are starting to ask a question that no major vendor can currently answer:

*How do you know this footage is what the camera recorded, unaltered?*

---

**The authentication gap**

No major surveillance camera vendor publicly documents:

- Footage hashed inside the camera before it leaves the hardware  
- A tamper-evident record of every time the footage was accessed  
- That record stored somewhere the vendor cannot alter it  

Without these controls, “this is what the camera recorded” is the vendor’s word. It is not independently verifiable. When that gap is challenged under evidence rules, cities inherit the risk — in court and at contract renewal.

---

**The accuracy problem**

The industry operates at a documented plate-character misread rate of approximately 10%. On actionable hot-list alerts that trigger stops — the output officers act on — the LAPD Office of the Inspector General (July 10, 2026) found a **32.3% false positive rate** (161 of 498 alerts) over two months; each false alert led to a stop of an innocent driver under high-risk stop protocol. Many failures were stale hot-list / database records, not OCR misreads — so the reliability unit is cameras + database + alert. Separately, Roseville, California found that in **71%** of 1,427 Flock felony/stolen alerts over two years, the cameras misread the plates (Business Insider / Roseville PD; IJ database). The Institute for Justice Database of ALPR Abuse (published August 12, 2026; 146 source-cited incidents) documents wrongful stops, gunpoint detentions, and jailings from plate misreads and misinterpreted alerts. LAPD allowed its Flock contract to expire rather than renew. A system used to initiate armed stops at a one-in-three false-positive rate is not a defensible legal standard. The appropriate floor is 0.1% or better, independently certified.

---

**Lawful activity at firearms-related locations**

ALPR cameras at or near gun ranges, gun stores, and gun shows log vehicles that arrive and leave — without a warrant and without the statutory framework that governs federal firearms transaction records (Form 4473). Travel-pattern data can identify who visits those locations. Federal agencies can query local networks.

H.R. 9800 — the Protection Against Mass Surveillance Act, introduced by Rep. Tim Burchett (R-TN) on July 21, 2026 — would restrict federal agencies’ purchase of and access to Flock-class mass surveillance systems. It is a pending legislative acknowledgment of the problem, not a partisan talking point.

Private businesses that host these cameras have reported being told they were “contractually obligated” to keep them operating after requesting removal (Eagle Sports Range, Cudahy, WI, August 2026). If a host cannot turn collection off, the city should ask who actually controls the data stream.

---

**What to require in your next contract**

Four clauses. Any vendor who refuses to sign them is telling you something. (Full text: `model-contract-language.md`.)

**1.** Footage must be hashed inside the camera hardware before transmission. The vendor must provide cryptographic proof of this on request, including to defense counsel in any case using the footage as evidence.

**2.** Every query must be logged with a case number. Queries without case numbers must be blocked — not flagged, blocked. The log must be stored in a form the vendor cannot alter after the fact.

**3.** The vendor must not integrate with any system capable of altering footage without leaving a detectable trace in the audit log. Violation is a material breach.

**4.** Location-sensitive collection: ALPR data collected at or near places associated with lawful sensitive activity — including medical, worship, legal-aid, and firearms-related locations — must not be used to build activity lists or share with federal agencies outside a documented investigation of a specific person. Private hosts of cameras at those locations must be able to terminate on notice (`model-contract-language.md` §7).

(Same integrity ideas should apply to **body-worn camera** contracts: hash before leave-device, activation/mute/export logs, export a third party can verify.)

---

**Free resources**

- Clause-ready model contract language:  
  **github.com/danielsmithdevelopment/surveillance-evidence-integrity**  
  → `model-contract-language.md`
- Challenge documents & evidence tool: **challengethefootage.com**
- Public defender access / questions: **pd@challengethefootage.com** · **sponsor@challengethefootage.com**

---

## Version 2: Public Defenders

---

**CHALLENGING SURVEILLANCE CAMERA EVIDENCE**

**A free tool that generates your motions, pre-populated with vendor-specific documented facts.**

**challengethefootage.com · Free for public defenders**

---

**The authentication gap no major vendor can close**

No major surveillance camera vendor — Flock Safety, Axon, Motorola Solutions, Genetec, Verkada — publicly documents cryptographic chain of custody for footage. No hash computed at the camera before footage leaves the hardware. No tamper-evident audit log. No external integrity proof independent of vendor infrastructure.

Under FRE 901(b)(9), the proponent must show the system produces accurate results. When authentication depends on vendor assertion rather than independently verifiable proof, you have a motion.

---

**Four vectors the tool generates documents for**

**FRE 901 — Authentication**  
Motion in limine arguing the footage cannot be independently authenticated. Ten specific discovery requests targeting the vendor’s integrity controls — or documented lack of them.

**FRE 702 / Daubert — Accuracy**  
Motion challenging system reliability. Documented ~10% ALPR character-misread estimates; Roseville, CA **71%** plate misread rate on 1,427 felony/stolen Flock alerts; LAPD OIG July 10, 2026 audit finding **32.3% false positives** on actionable Flock hot-list alerts (stale database / system-of-systems failures). IJ Database of ALPR Abuse (146 source-cited incidents). A 0.1% independently certified floor as the procurement/evidence standard vendors cannot currently show.

**Fourth Amendment — Suppression**  
Motion arguing unauthorized or undocumented access. FOIA-derived patterns of case-number-less Flock searches. IJ Database of ALPR Abuse (146 incidents, Aug. 12, 2026) — stalking, personal misuse, evidence tampering. Discovery into the searching officer’s query history.

**42 U.S.C. § 1983 — Civil demand letter**  
For your client’s civil claim when facts support it — including Fourth Amendment theories, Monell agency liability where departments failed to audit Flock use (Washington Post, Aug. 19, 2026), and parallel claims under applicable constitutional doctrine. Damages framing, fee-shifting under §1988, response deadline.

---

**Body camera footage**

Select footage category **Body-worn**, then recording status:

| Status | What the tool emphasizes |
|---|---|
| **Missing** | Stage 1 — duty to record; adverse inference / spoliation; Brady incompleteness; discovery of activation logs and policy. Sourced themes: Colorado § 24-31-902 / *People v. Havens*; Illinois BWC Act / *People v. Tompkins*; Chicago COPA non-compliance findings. |
| **Partial** | Stage 1 for gaps + Stage 2 for any clip that exists. |
| **Recorded** | Stage 2 — authenticity of the file (hash before leave-device, mute/dock/export audit, Evidence.com-class cloud as sole oracle). |

---

**Cell phone / civilian recording**

Select **Cell phone**. Use when the state (or a witness) offers phone video — including AI-enhanced or chat-re-exported clips (*State v. Puloka*; *Mendones*). If your client captured the encounter with Challenge the Footage Evidence, share the **session ID** with counsel:  
`GET /api/evidence/verify/{sessionId}` returns hashes, Merkle root, optional independent verification reference, and a how-to-verify checklist.  
**Audio and video are authoritative**; on-device transcripts can be imperfect and are labeled accordingly.

---

**How to get free access**

Email **pd@challengethefootage.com** from your office address. Access is activated within one business day. Unlimited generations after whitelist.

For a whole office, send one email listing attorneys’ Google accounts (or the office domain pattern you use) — each account is whitelisted in turn.

---

**Open-source standards**

Model contract language, model legislation, technical standards, and the authentication challenge guide:

**github.com/danielsmithdevelopment/surveillance-evidence-integrity**

Every generated document is a starting point for attorney review. Verify facts. Adapt to your jurisdiction.

---

*Challenge the Footage generates document templates for attorney review, not legal advice. No attorney-client relationship is created. Factual claims are sourced to publicly available documentation — see the GitHub repository and in-product citations.*
