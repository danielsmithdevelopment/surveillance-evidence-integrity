# Outreach Emails — challengethefootage.com Launch

---

## Email 1: Institute for Justice

**To:** media@ij.org (CC: plateproject@ij.org if available)
**Subject:** Free tool for challenging ALPR evidence — built on your research

---

My name is Daniel Smith. I'm a software engineer and the author of the ClawQL security architecture documented at docs.clawql.com.

I built challengethefootage.com — a free tool that generates legal document templates for challenging surveillance camera evidence in court. It's built directly on top of your research.

The tool generates four documents for any major ALPR vendor — Flock, Axon, Motorola Solutions, Genetec, Verkada, or custom:

A motion in limine under FRE 901, arguing that footage cannot be authenticated because no vendor publicly documents cryptographic hashing at capture, Merkle-chained audit logs, or external immutable anchoring.

A Daubert / FRE 702 motion challenging the reliability of AI-generated identification evidence, grounded in the approximately 10% error rate documented in industry reporting and acknowledged in DHS's own June 2025 market survey. The motion argues for a 0.1% maximum error rate standard for evidence used in criminal prosecution — two orders of magnitude better than current documented performance.

A Fourth Amendment suppression motion targeting unauthorized access and the stalking pattern your research has documented — specifically using the 28+ cases from your ongoing review as pattern evidence that searches without documented case numbers and purpose cannot be distinguished from personal abuse.

A Section 1983 civil demand letter for people wrongfully stopped, detained, or surveilled, with damages ranges, the qualified immunity landscape by state, and a 30-day response deadline.

The model contract language and draft state legislation are published as open source at github.com/danielsmithdevelopment/surveillance-evidence-integrity.

Public defenders get free access. The tool costs $9 per generation for everyone else — enough to cover inference costs.

I'm not a lawyer and the tool is explicitly framed as document templates for attorney review, not legal advice. Everything generated carries a prominent disclaimer.

I wanted to reach you before the public launch because your research is cited throughout the tool and the documents it generates. If there are factual errors in how I've characterized your findings, I want to fix them before they go out in thousands of generated motions. And if this is something the Plate Privacy Project would find useful to share with the attorneys and affected people you work with, I'd welcome the conversation.

The tool is live at challengethefootage.com. The technical and legal documentation is at github.com/danielsmithdevelopment/surveillance-evidence-integrity.

Daniel Smith
danielsmithdevelopment.com
@danielsmithdev

---

## Email 2: Electronic Frontier Foundation

**To:** info@eff.org
**Subject:** Free legal challenge tool — built on EFF's ALPR research

---

My name is Daniel Smith. I'm a software engineer and the author of the ClawQL security architecture.

I built challengethefootage.com — a free tool that generates legal document templates for challenging surveillance camera evidence. It's built on EFF's research and I wanted to reach you before the public launch.

The tool addresses two problems your organization has documented in depth.

The first is the chain of custody problem. No major ALPR vendor — Flock, Axon, Motorola Solutions, Genetec, Verkada — publicly documents cryptographic hashing of footage within camera hardware at capture, Merkle-chained audit logs, or external immutable anchoring of footage integrity. Your 2022 reporting on Toka's capability to alter surveillance footage without forensic traces established the baseline risk. The tool generates FRE 901 authentication motions arguing that footage without independent cryptographic verification cannot be authenticated under the standard FRE 901(b)(9) requires.

The second is the accuracy problem. Your analysis of approximately 12 million Flock searches found hundreds tied to political demonstrations and searches targeting vulnerable populations. The 10% plate misread rate documented in industry research, combined with DHS's own June 2025 acknowledgment of character confusion errors without setting any minimum standard, is the basis for FRE 702 / Daubert reliability challenges. The tool generates motions arguing that a 0.1% maximum error rate should be the floor for AI-generated evidence used in criminal prosecution.

The tool also generates Fourth Amendment suppression motions using the documented pattern of officer abuse — 28+ cases from Institute for Justice research — as evidence that searches without documented case numbers cannot be distinguished from personal misuse. And Section 1983 civil demand letters for people wrongfully stopped or surveilled.

Public defenders get free access. $9 per generation for everyone else, covering infrastructure costs.

Everything is framed as document templates for attorney review, not legal advice. The open-source legal standards and model contract language are at github.com/danielsmithdevelopment/surveillance-evidence-integrity.

I wanted to reach you before launch in case there are factual errors in how I've characterized EFF's research. The documents this tool generates will cite EFF's work and I want those citations to be accurate. And if this is something EFF's audience or your Deeplinks readers would find useful, I'd welcome the conversation.

Daniel Smith
danielsmithdevelopment.com
@danielsmithdev

---

## Email 3: NACDL Technology Committee

**To:** assist@nacdl.org
**Subject:** Free tool generating ALPR challenge motions for defense attorneys

---

My name is Daniel Smith. I'm writing to the NACDL Technology Committee about a tool I've built that I think your members will find immediately useful.

challengethefootage.com generates four legal document templates for challenging automated license plate reader and surveillance camera evidence — for any major vendor. It's free for public defenders.

The tool generates:

A motion in limine under FRE 901 arguing that ALPR footage lacks the cryptographic chain of custody required for authentication under FRE 901(b)(9). No major vendor publicly documents hash-at-capture within camera hardware, Merkle-chained audit logs, or external immutable anchoring — meaning "this is what the camera recorded" is a vendor assertion, not a verifiable fact.

A Daubert / FRE 702 motion challenging the reliability of AI-generated identification evidence. The documented approximately 10% ALPR misread rate — acknowledged in DHS's own June 2025 market survey — combined with at least 27 documented wrongful stops and detentions from misidentification since 2018 (Institute for Justice), provides the factual basis for arguing the system does not meet the reliability standard FRE 702 requires. The motion argues for a 0.1% maximum error rate standard for evidence used in criminal prosecution.

A Fourth Amendment suppression motion using the documented pattern of officer abuse — at least 28 cases of officers using ALPR systems to track romantic interests, documented by the Institute for Justice — as pattern evidence that searches without documented case numbers and authorization cannot be distinguished from personal misuse.

A Section 1983 civil demand letter for clients wrongfully stopped, detained at gunpoint, or surveilled without legitimate law enforcement purpose.

Each document is populated with the specific vendor's documented facts, your client's case details, and context recalled from your prior sessions via a persistent memory layer. The tool is powered by ClawQL's agentic AI infrastructure.

Public defenders and public defender offices can request free access by emailing pd@challengethefootage.com. Private defense attorneys pay $9 per generation.

Everything generated carries a prominent disclaimer that it is a template for attorney review, not legal advice, and that the attorney must verify all facts and adapt the document to their specific jurisdiction and case.

The open-source standards and model legislation are at github.com/danielsmithdevelopment/surveillance-evidence-integrity.

I'd welcome the opportunity to present this to the Technology Committee or to brief members who handle cases involving ALPR evidence.

Daniel Smith
danielsmithdevelopment.com
@danielsmithdev

---

## Public Defender Free Access Program

### How it works

Public defenders and public defender offices get free unlimited access. Verification is lightweight — an email from a government or public defender office domain, or a bar number lookup. No friction beyond that.

**Email address for PD requests:** pd@challengethefootage.com

**Verification flow:**
1. PD emails pd@challengethefootage.com from their government email address (`.gov`, `.pd.`, public defender office domain)
2. You manually or semi-automatically verify and issue a promo code or whitelist their Google account
3. They sign in with Google and the entitlement check returns `entitled: true` for their account

**What to add to the Worker:** A whitelist in KV — `pd_whitelist:{email}` → `true`. The entitlement check queries this before the gateway. No Stripe required for whitelisted accounts.

**What to add to the site:** A short page at `challengethefootage.com/public-defenders` explaining free access, what verification requires, and the pd@ email address.

**What to say on the site:**

---

*Public defenders and public defender offices have free unlimited access to all four document types.*

*This tool exists to help people who are up against well-funded surveillance infrastructure with limited resources to fight back. Public defenders are on the front line of that fight.*

*To request free access, email pd@challengethefootage.com from your office email address. We'll verify and activate your account within one business day.*

---

### Longer-term: Sponsor a generation

Once the tool has traction, add a "sponsor" mechanism:

- Law firms, individuals, or organizations can pre-purchase blocks of generations at cost ($3–5 each in bulk)
- Those generations are distributed to the PD free pool
- Sponsors get a receipt and a note on how many people their contribution helped

This creates a public interest funding loop without requiring nonprofit status: commercial users and sponsors subsidize PD access, PD use generates case law and credibility, case law and credibility drive more commercial users.
