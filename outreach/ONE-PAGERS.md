# Challenge the Footage — One-Pagers

Two print-ready versions: city councils / contracting authorities, and public defenders.  
Aimed at one page each when pasted into a letterhead or Google Doc (11–12 pt body).

**Last reviewed:** August 5, 2026 · Aligned with PRs #1–#9 / [PRODUCT.md](../challenge-tool/PRODUCT.md)

---

## Version 1: City Councils and Contracting Authorities

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

The industry operates at a documented misidentification error rate of approximately 10% — one in ten plates misread. The Institute for Justice has documented at least 27 people detained at gunpoint or jailed due to license plate reader errors since 2018. A 10% error rate on a system used to initiate arrests is not defensible as a legal standard. The appropriate floor is 0.1% or better, independently certified.

---

**The access problem**

Public records data shows that 84% of searches run against the Flock Safety network carried no case number. The Institute for Justice has documented at least 28 officers using license plate reader systems to track romantic interests. When most searches lack documented justification, unauthorized personal use is structurally undetectable.

---

**What to require in your next contract**

Three clauses. Any vendor who refuses to sign them is telling you something.

**1.** Footage must be hashed inside the camera hardware before transmission. The vendor must provide cryptographic proof of this on request, including to defense counsel in any case using the footage as evidence.

**2.** Every query must be logged with a case number. Queries without case numbers must be blocked — not flagged, blocked. The log must be stored in a form the vendor cannot alter after the fact.

**3.** The vendor must not integrate with any system capable of altering footage without leaving a detectable trace in the audit log. Violation is a material breach.

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
Motion challenging system reliability. Documented ~10% ALPR error estimates. At least 27 wrongful stops and detentions since 2018 (Institute for Justice). A 0.1% independently certified floor as the procurement/evidence standard vendors cannot currently show.

**Fourth Amendment — Suppression**  
Motion arguing unauthorized or undocumented access. FOIA-derived patterns of case-number-less Flock searches. 28+ documented officer stalking / misuse cases. Discovery into the searching officer’s query history.

**42 U.S.C. § 1983 — Civil demand letter**  
For your client’s civil claim. Damages framing, fee-shifting under §1988, response deadline, CC line for civil-rights organizations.

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

Select **Cell phone**. Use when the state (or a witness) offers phone video — including AI-enhanced or chat-re-exported clips (*State v. Puloka*; *Mendones*). If your client captured the encounter with Challenge the Footage Evidence / Witness, share the **session ID** with counsel:  
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
