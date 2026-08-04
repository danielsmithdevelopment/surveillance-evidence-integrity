/**
 * Surveillance Evidence Challenge Tool — Cloudflare Worker
 *
 * Four attack vectors:
 *   1. Authentication (FRE 901) — no Merkle chain, no hash at capture
 *   2. Accuracy (FRE 702 / Daubert) — ~10% documented error rate
 *   3. Access abuse — stalking, unauthorized queries, no case number
 *   4. Civil damages — Section 1983 demand letter for wrongful stops/surveillance
 *
 * Routes:
 *   POST /api/checkout
 *   GET  /api/entitlement
 *   POST /api/generate
 *   GET  /api/history
 *   GET  /api/session/:id
 *   GET  /api/health
 *
 * Also: Link headers, Markdown negotiation (Accept: text/markdown), agent-ready well-known files.
 *
 * Local/dev testing (see .dev.vars.example):
 *   ALLOW_TEST_AUTH=true  + Authorization: Bearer test:<userId>:<email>
 *   GENERATION_MODE=offline  (or omit CLAWQL_* secrets) → deterministic templates
 */

import { buildOfflineDocs } from "./offline-docs.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const FREE_GENERATIONS = 1;
const FREE_TTL_S = 60 * 60 * 24 * 365;

const AGENT_LINK_HEADER = [
  '<https://challengethefootage.com/sitemap.xml>; rel="sitemap"',
  '</llms.txt>; rel="alternate"; type="text/plain"',
  '</llms-full.txt>; rel="alternate"; type="text/plain"',
  '</auth.md>; rel="alternate"; type="text/markdown"',
  '</AGENTS.md>; rel="author"',
  '</openapi.json>; rel="service-desc"; type="application/openapi+json"',
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</.well-known/agent-card.json>; rel="agent-card"; type="application/json"',
  '</.well-known/mcp/server-card.json>; rel="mcp-server-card"; type="application/json"',
  '</.well-known/oauth-authorization-server>; rel="oauth-authorization-server"; type="application/json"',
  '</.well-known/acp.json>; rel="payment-method"',
  '</api/health>; rel="status"',
  '<https://github.com/danielsmithdevelopment/surveillance-evidence-integrity>; rel="describedby"',
].join(", ");

const CONTENT_TYPE_OVERRIDES = {
  "/.well-known/api-catalog":
    'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
  "/.well-known/agent-card.json": "application/json; charset=utf-8",
  "/.well-known/mcp/server-card.json": "application/json; charset=utf-8",
  "/.well-known/oauth-protected-resource": "application/json; charset=utf-8",
  "/.well-known/oauth-authorization-server": "application/json; charset=utf-8",
  "/.well-known/openid-configuration": "application/json; charset=utf-8",
  "/.well-known/acp.json": "application/json; charset=utf-8",
  "/.well-known/agent-skills/index.json": "application/json; charset=utf-8",
  "/openapi.json": "application/openapi+json; charset=utf-8",
  "/robots.txt": "text/plain; charset=utf-8",
  "/sitemap.xml": "application/xml; charset=utf-8",
  "/llms.txt": "text/plain; charset=utf-8",
  "/llms-full.txt": "text/plain; charset=utf-8",
  "/auth.md": "text/markdown; charset=utf-8",
  "/AGENTS.md": "text/markdown; charset=utf-8",
};

function wantsMarkdown(request) {
  const accept = (request.headers.get("Accept") || "").toLowerCase();
  if (!accept.includes("text/markdown")) return false;
  const md = accept.indexOf("text/markdown");
  const html = accept.indexOf("text/html");
  if (html === -1) return true;
  return md !== -1 && md < html;
}

function markdownAssetPath(pathname) {
  if (pathname === "/" || pathname === "/index.html") return "/index.md";
  if (pathname === "/terms.html" || pathname === "/terms") return "/terms.md";
  if (pathname === "/public-defenders.html" || pathname === "/public-defenders") {
    return "/public-defenders.md";
  }
  if (pathname === "/evidence.html" || pathname === "/evidence") return "/evidence.md";
  return null;
}

async function serveAssets(request, env) {
  const url = new URL(request.url);
  let assetRequest = request;

  if (request.method === "GET" && wantsMarkdown(request)) {
    const mdPath = markdownAssetPath(url.pathname);
    if (mdPath) {
      const mdUrl = new URL(mdPath, url.origin);
      assetRequest = new Request(mdUrl, request);
    }
  }

  let response = await env.ASSETS.fetch(assetRequest);
  // Fallback: if markdown missing, serve HTML as usual
  if (response.status === 404 && assetRequest.url !== request.url) {
    response = await env.ASSETS.fetch(request);
  }

  const headers = new Headers(response.headers);
  headers.set("Link", AGENT_LINK_HEADER);
  headers.set("Vary", mergeVary(headers.get("Vary"), "Accept"));

  const path = new URL(assetRequest.url).pathname;
  if (CONTENT_TYPE_OVERRIDES[path]) {
    headers.set("Content-Type", CONTENT_TYPE_OVERRIDES[path]);
  } else if (path.endsWith(".md") || wantsMarkdown(request)) {
    headers.set("Content-Type", "text/markdown; charset=utf-8");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function mergeVary(existing, value) {
  if (!existing) return value;
  const parts = existing.split(",").map((s) => s.trim().toLowerCase());
  if (parts.includes(value.toLowerCase())) return existing;
  return `${existing}, ${value}`;
}

// ─── Vendor profiles ──────────────────────────────────────────────────────────

const VENDORS = {
  flock: {
    name: "Flock Safety",
    errorRateFacts: [
      "A 2019 estimate found license plate reader accuracy is approximately 90%, meaning one in ten plates is misread. This figure predates Flock's current deployment scale but reflects the underlying OCR technology all ALPR vendors share.",
      "One study found ALPRs misread the state designation on 1-in-10 plates, independent of character misidentification errors — meaning the total error rate is higher than the 10% figure alone.",
      "The DHS's own June 2025 ALPR market survey acknowledges that 'a small error rate occurs in the translation of alphanumeric characters that are similar in shape (e.g., the numeral zero and the letter O, the numeral one and the letter I)' without quantifying or setting any minimum acceptable standard.",
      "The Institute for Justice has documented at least 27 cases since 2018 of innocent motorists pulled over, detained at gunpoint, or jailed due to ALPR errors, with the majority occurring since 2023.",
      "In 2025, an Oak Park, Illinois oversight board concluded: 'There is no evidence whatsoever that Flock Safety ALPRs have played a meaningful role in any Oak Park crime investigation since their installation in 2022.' Oak Park ended its Flock contract in August 2025.",
    ],
    accessAbuseFacts: [
      "An Institute for Justice review has identified at least 28 documented cases nationwide of police officers using ALPR camera networks to surveil romantic interests, current partners, former partners, and strangers — the majority occurring since 2024.",
      "In Sedgwick, Kansas, former police chief Lee Nygaard used Flock cameras to track his ex-girlfriend's vehicles 228 times over more than four months and physically followed her and her new boyfriend in his police vehicle.",
      "In Orange City, Florida, Officer Jarmarus Brown ran his ex-girlfriend's license plate through Flock at least 69 times during summer 2024, also searching her mother's plate at least 24 times and her father's plate at least 15 times. Brown was arrested and charged in 2025.",
      "In Louisville, Kentucky, Officer Roberto Cedeno was charged with multiple felonies in 2025 for tracking an ex-partner and her friends hundreds of times over two months using the city's ALPR system.",
      "In Shelby County, Tennessee, Deputy Thadius Gordon was relieved of duty after using the ALPR database to locate his ex-wife more than 100 times.",
      "In Riverside County, California, Deputy Alexander Vanny — who had been arrested for kidnapping his ex-fiancée — used the department's Flock system to track one of her friends. He was convicted of multiple charges in December 2025.",
      "In Braselton, Georgia, Police Chief Michael Steffman was arrested for allegedly using ALPR systems to stalk and harass multiple private citizens not under investigation for any crime.",
      "EFF analysis of approximately 12 million Flock searches found hundreds tied to political demonstrations, and searches used to target Romani people and to surveil women seeking reproductive care.",
      "By August 2025, members of Congress had opened a formal investigation into Flock Safety's role in enabling surveillance of women, immigrants, and other vulnerable groups.",
      "FOIA-derived audit logs from haveibeenflocked.com show 233 million searches against Flock's network, with 84% carrying no case number — the absence of case numbers making unauthorized personal use structurally undetectable within the system.",
      "Flock Safety claims that with 140,000 monthly active users, abuse incidents are 'rare.' Investigators and researchers describe documented cases as almost certainly a vast undercount, noting that most misconduct is never detected because audits are infrequent and officers frequently cite vague or inaccurate reasons for searches.",
    ],
    authFacts: [
      "Flock Safety's audit logs obtained via FOIA do not contain cryptographic hash values for footage segments and show no evidence of Merkle chaining or external immutable anchoring.",
      "Andreessen Horowitz (a16z) has funded both Flock Safety and Toka, an Israeli cyber firm co-founded by former Prime Minister Ehud Barak and former IDF cyber chief Yaron Rosen. Haaretz reported in 2022 based on internal documents that Toka sells technology capable of altering both live and archived camera feeds without leaving forensic traces.",
      "FBI and Homeland Security have accessed local Flock networks without clear awareness or approval from contracting localities.",
    ],
    civilFacts: [
      "In October 2024, the Institute for Justice filed a federal lawsuit against the city of Norfolk, Virginia — the first civil ALPR lawsuit to survive a government motion to dismiss.",
      "IJ has filed a federal class action against San Jose, California, which operates 474 Flock Safety cameras conducting approximately 15,000 database searches per day against people never accused of any crime.",
      "Section 1983 provides a federal cause of action for deprivation of constitutional rights under color of state law. Wrongful stops and detentions based on ALPR misidentification implicate the Fourth Amendment right to be free from unreasonable seizures.",
      "Wrongful arrest settlements involving short detention without physical injury typically range from $10,000 to $75,000. Cases involving prolonged detention, lost employment, physical injury, or emotional trauma frequently reach $100,000 to $500,000 or more.",
      "Colorado and New Mexico have fully or partially abolished qualified immunity for state law claims as of 2026, and California and Washington have active legislation under consideration — eliminating the primary defense available to officers in those jurisdictions.",
    ],
    sources: [
      "haveibeenflocked.com — FOIA-derived audit logs",
      "Institute for Justice — ALPR error and abuse documentation (2024–2026)",
      "EFF — ALPR accuracy and misuse reporting",
      "Haaretz 2022 — Toka internal documents",
      "DHS SAVER ALPR Market Survey Report, June 2025",
      "404 Media — Flock stalking case reporting",
      "ACLU — ALPR abuse documentation",
    ],
  },

  axon: {
    name: "Axon (formerly TASER)",
    errorRateFacts: [
      "ALPR technology across all vendors operates at a documented error rate of approximately 10% for plate misreads, based on a 2019 estimate and confirmed by DHS's 2025 market survey acknowledging character confusion errors without setting any minimum standard.",
      "Axon body camera footage is subject to the same downstream chain of custody questions as ALPR footage: cloud storage on Microsoft Azure means integrity depends on Axon's internal controls rather than independently verifiable cryptographic proof.",
    ],
    accessAbuseFacts: [
      "Multiple public records requests and civil litigation have raised questions about Axon Evidence audit log completeness and whether all access events are logged in a tamper-evident manner.",
      "The broader ALPR officer abuse pattern — documented in at least 28 cases nationwide by the Institute for Justice — reflects systemic access control failures across all vendors, not Flock-specific failures.",
    ],
    authFacts: [
      "Axon Evidence does not publicly document cryptographic hashing of footage within camera hardware at capture, Merkle-chained audit logs, or external immutable anchoring of footage integrity.",
      "Cloud storage on third-party infrastructure introduces additional chain of custody questions independent of Axon's internal access controls.",
    ],
    civilFacts: [
      "Section 1983 provides a federal cause of action for deprivation of constitutional rights under color of state law, applicable to wrongful stops and detentions based on misidentification from any surveillance system.",
      "Wrongful arrest settlements involving short detention without physical injury typically range from $10,000 to $75,000. Cases involving prolonged detention, lost employment, or physical injury frequently reach $100,000 to $500,000 or more.",
    ],
    sources: [
      "Axon Evidence platform documentation (public)",
      "EFF and ACLU surveillance reporting",
      "Institute for Justice — ALPR error documentation",
      "DHS SAVER ALPR Market Survey Report, June 2025",
    ],
  },

  motorola: {
    name: "Motorola Solutions (Vigilant Solutions)",
    errorRateFacts: [
      "ALPR technology across all vendors operates at a documented error rate of approximately 10% for plate misreads, based on a 2019 estimate and confirmed by DHS's 2025 market survey.",
      "Vigilant Solutions' LEARN database aggregates ALPR data from multiple sources. Database errors — including failure to remove recovered stolen vehicles from hotlists — have contributed to wrongful stops independent of read accuracy errors.",
    ],
    accessAbuseFacts: [
      "Civil liberties researchers have documented that Vigilant/Motorola ALPR data is shared broadly across law enforcement networks with limited access logging visible to contracting agencies.",
      "The LEARN database's cross-jurisdictional sharing means unauthorized access by officers in one jurisdiction may expose data from cameras operated by entirely different agencies.",
      "The officer abuse pattern documented across ALPR systems — at least 28 cases nationwide of romantic partner surveillance — is a systemic failure of access controls that applies to any vendor without meaningful query auditing.",
    ],
    authFacts: [
      "Motorola Solutions' CommandCentral Evidence platform does not publicly document cryptographic hashing at capture, Merkle-chained audit logs, or external immutable anchoring.",
      "LEARN database sharing limits contracting agency visibility into who is accessing data and for what purpose.",
    ],
    civilFacts: [
      "Section 1983 provides a federal cause of action for Fourth Amendment violations arising from wrongful stops based on ALPR misidentification.",
      "Database maintenance failures — such as failure to remove recovered vehicles from stolen vehicle hotlists — have independently caused wrongful stops and created civil liability.",
    ],
    sources: [
      "EFF — Vigilant Solutions reporting",
      "ACLU — ALPR data sharing documentation",
      "Institute for Justice — ALPR error documentation",
      "DHS SAVER ALPR Market Survey Report, June 2025",
    ],
  },

  genetec: {
    name: "Genetec",
    errorRateFacts: [
      "ALPR technology across all vendors operates at a documented error rate of approximately 10% for plate misreads.",
      "Genetec's AutoVu ALPR system uses the same underlying OCR technology subject to character confusion errors documented across the industry.",
    ],
    accessAbuseFacts: [
      "Genetec's platform includes audit logging features internal to Genetec infrastructure and not independently verifiable without Genetec cooperation.",
      "The systemic officer abuse pattern documented across ALPR systems applies to any vendor without robust, independently auditable access controls.",
    ],
    authFacts: [
      "Genetec does not publicly document cryptographic hashing of footage within camera hardware, Merkle-chained audit logs, or external immutable anchoring.",
      "Independent verification of footage integrity requires Genetec cooperation — there is no external anchor allowing third-party verification.",
    ],
    civilFacts: [
      "Section 1983 provides a federal cause of action for Fourth Amendment violations arising from wrongful stops based on ALPR misidentification.",
    ],
    sources: [
      "Genetec Security Center documentation (public)",
      "Institute for Justice — ALPR error documentation",
      "DHS SAVER ALPR Market Survey Report, June 2025",
    ],
  },

  verkada: {
    name: "Verkada",
    errorRateFacts: [
      "In March 2021, hackers gained access to live feeds from approximately 150,000 Verkada cameras, demonstrating that centralized cloud-managed surveillance infrastructure can be compromised at scale without detection.",
      "The 2021 breach exposed that Verkada's centralized 'super admin' access control model could be compromised through a single credential — a systemic architectural vulnerability independent of read accuracy.",
    ],
    accessAbuseFacts: [
      "The 2021 Verkada breach demonstrated that unauthorized access to surveillance footage can occur at scale without triggering detection — the same structural problem that enables officer abuse in ALPR systems.",
      "All Verkada footage access depends on Verkada's cloud infrastructure. There is no independently verifiable record of access events outside Verkada's own systems.",
    ],
    authFacts: [
      "Verkada does not publicly document cryptographic hashing of footage within camera hardware, Merkle-chained audit logs, or external immutable anchoring of footage integrity.",
      "The 2021 breach demonstrated that Verkada's internal access controls could be defeated, undermining any claim that access logs are complete or reliable.",
    ],
    civilFacts: [
      "Section 1983 provides a federal cause of action for Fourth Amendment violations arising from wrongful identification or surveillance based on footage from systems with demonstrated integrity failures.",
    ],
    sources: [
      "Bloomberg and VICE/Motherboard — March 2021 Verkada breach reporting",
      "Verkada Command platform documentation (public)",
      "Institute for Justice — ALPR error documentation",
    ],
  },
};

// ─── System prompt factory ────────────────────────────────────────────────────

function buildSystemPrompt(vendorKey, customDetails) {
  const profile = VENDORS[vendorKey] || null;
  const vendorName = profile?.name || customDetails?.name || "the surveillance vendor";

  const profileSection = profile
    ? `
## Documented facts: ${vendorName}

### Authentication and integrity gaps
${profile.authFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

### System accuracy and error rate
${profile.errorRateFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

### Access abuse and unauthorized use
${profile.accessAbuseFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

### Civil liability and litigation context
${profile.civilFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

### Sources
${profile.sources.map((s) => `- ${s}`).join("\n")}
`
    : customDetails?.additionalVendorFacts
      ? `
## User-provided facts about ${vendorName}
${customDetails.additionalVendorFacts}
`
      : `
## Vendor: ${vendorName}
No pre-populated profile available. Apply the general arguments across all four vectors based on the absence of documented controls. Discovery requests should seek documentation of any accuracy testing, error rate data, access logs, and integrity controls that may exist.
`;

  return `You are a legal and technical expert helping people challenge surveillance camera evidence and seek civil remedies for surveillance-related harms. You generate four types of documents, each targeting a different vulnerability in how surveillance systems are used as evidence or for enforcement.

## The four attack vectors

### Vector 1 — Authentication (FRE 901)
Surveillance footage offered as evidence must be authenticated under FRE 901. FRE 901(b)(9) requires the proponent to show the system producing the evidence is reliable and produces accurate results. No major surveillance vendor publicly documents: (1) cryptographic hashing of footage within camera hardware before network transmission, (2) Merkle-chained audit logs, (3) external immutable anchoring of Merkle roots to a system outside the vendor's control, or (4) tamper-evident access logs for all queries. Without these controls, "this is what the camera recorded, unaltered" is a vendor assertion — not a provable fact. The capability to alter footage without forensic traces is commercially available (Toka, documented by Haaretz 2022).

### Vector 2 — Accuracy (FRE 702 / Daubert)
AI-generated evidence is subject to reliability scrutiny under FRE 702 and Daubert. ALPR systems operate at a documented error rate of approximately 10% for plate misreads — confirmed by a 2019 industry estimate and acknowledged in DHS's own June 2025 market survey. No court has established an acceptable error rate for AI-generated evidence used to initiate stops, detentions, or arrests. A system with a 10% error rate scanning 2,000 plates per minute produces thousands of false identifications per hour across a network. The appropriate standard for evidence used in criminal prosecution should be no worse than 1 error per 1,000 reads (0.1%) — two orders of magnitude better than current documented performance. Until vendors can demonstrate compliance with that standard through independent testing, the reliability requirement of FRE 702 and Daubert is not met.

### Vector 3 — Access abuse and Fourth Amendment
The Fourth Amendment protects against unreasonable searches and seizures. ALPR data used to initiate a stop or investigation is a search. When that search is conducted without a legitimate law enforcement purpose — as documented in at least 28 cases of officer abuse nationwide — it is an unconstitutional search and any evidence obtained is subject to suppression under the exclusionary rule. Discovery into the searching officer's query history, case number documentation, and department abuse record is essential.

### Vector 4 — Civil damages (Section 1983)
42 U.S.C. § 1983 provides a federal cause of action for deprivation of constitutional rights under color of state law. Wrongful stops, detentions at gunpoint, and arrests based on ALPR misidentification constitute Fourth Amendment violations actionable under Section 1983. Damages include compensatory damages for detention time, economic losses, emotional distress, and reputational harm; punitive damages where officer conduct was egregious; and attorney's fees under 42 U.S.C. § 1988. Settlements in wrongful arrest cases range from $10,000–$75,000 for brief detentions to $100,000–$500,000+ for prolonged detention or physical harm. Colorado and New Mexico have abolished qualified immunity for state claims; California and Washington have active legislation.
${profileSection}
## Document generation standards

Every document must be precise, authoritative, and immediately usable as an attorney-review starting point. Lead with the strongest factual claims. Cite sources. No throat-clearing. Number argument paragraphs. Write as if a senior civil rights attorney will review and file this.`;
}

// ─── Disclaimer ───────────────────────────────────────────────────────────────

function buildDisclaimer(sessionId, vendorName) {
  return `DOCUMENT TEMPLATE — NOT LEGAL ADVICE
=====================================

Vendor addressed: ${vendorName}
Generated: ${new Date().toISOString()}
Session: ${sessionId}
Tool: github.com/danielsmithdevelopment/surveillance-evidence-integrity

THIS IS A STARTING TEMPLATE FOR ATTORNEY REVIEW.
IT IS NOT LEGAL ADVICE. No attorney-client relationship has been created.

BEFORE FILING OR SUBMITTING THIS DOCUMENT:
  1. Have it reviewed by a licensed attorney in your jurisdiction.
  2. Verify all factual claims are accurate and current.
  3. Confirm cited rules and case law apply in your specific court.
  4. Adapt to the specific facts of your case.

${"━".repeat(68)}

`;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/health" && request.method === "GET") {
        return json({
          ok: true,
          service: "challenge-the-footage",
          time: new Date().toISOString(),
          generationMode: wantsOfflineGeneration(env) ? "offline" : "gateway",
          testAuthEnabled: env.ALLOW_TEST_AUTH === "true",
        });
      }
      if (url.pathname === "/api/checkout" && request.method === "POST")
        return handleCheckout(request, env);
      if (url.pathname === "/api/entitlement" && request.method === "GET")
        return handleEntitlement(request, env);
      if (url.pathname === "/api/generate" && request.method === "POST")
        return handleGenerate(request, env);
      if (url.pathname === "/api/history" && request.method === "GET")
        return handleHistory(request, env);
      if (url.pathname.startsWith("/api/session/") && request.method === "GET") {
        return handleSession(request, env, url.pathname.split("/api/session/")[1]);
      }
      if (url.pathname === "/api/evidence/secure" && request.method === "POST") {
        return handleEvidenceSecure(request, env);
      }
      if (url.pathname === "/api/evidence/secure-device" && request.method === "POST") {
        return handleEvidenceSecureDevice(request, env);
      }
      if (url.pathname === "/api/evidence/claim" && request.method === "POST") {
        return handleEvidenceClaim(request, env);
      }
      if (url.pathname === "/api/evidence/sessions" && request.method === "GET") {
        return handleEvidenceSessions(request, env);
      }
      if (url.pathname.startsWith("/api/evidence/verify/") && request.method === "GET") {
        return handleEvidenceVerify(request, env, url.pathname.split("/api/evidence/verify/")[1]);
      }
      // Static assets (Pages / Workers assets binding) + agent-ready headers
      if (env.ASSETS) {
        return serveAssets(request, env);
      }
      return json({ error: "Not found" }, 404);
    } catch (err) {
      console.error("Worker error:", err);
      return json({ error: "Internal error", detail: err.message }, 500);
    }
  },
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function verifyGoogleToken(token, clientId) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
  if (!res.ok) throw new Error("Invalid Google token");
  const p = await res.json();
  if (p.aud !== clientId) throw new Error("Token audience mismatch");
  if (p.exp < Date.now() / 1000) throw new Error("Token expired");
  return { userId: p.sub, email: p.email, name: p.name };
}

/**
 * Resolve the caller. When ALLOW_TEST_AUTH=true, accepts:
 *   Authorization: Bearer test:<userId>:<email>
 * Never enable ALLOW_TEST_AUTH in production.
 */
async function resolveUser(request, env) {
  const token = extractBearer(request);
  if (env.ALLOW_TEST_AUTH === "true" && token.startsWith("test:")) {
    const parts = token.split(":");
    const userId = parts[1] || "test-user";
    const email = parts.slice(2).join(":") || "test@example.com";
    return {
      userId,
      email,
      name: "Test User",
      testAuth: true,
    };
  }
  if (!env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID not configured");
  }
  return verifyGoogleToken(token, env.GOOGLE_CLIENT_ID);
}

function extractBearer(req) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) throw new Error("Missing authorization header");
  return auth.slice(7);
}

function wantsOfflineGeneration(env) {
  if (env.GENERATION_MODE === "offline") return true;
  if (env.GENERATION_MODE === "gateway") return false;
  return !env.CLAWQL_GATEWAY_URL || !env.CLAWQL_API_KEY;
}

// ─── Gateway helpers ──────────────────────────────────────────────────────────

async function gwGet(env, path) {
  const res = await fetch(`${env.CLAWQL_GATEWAY_URL}${path}`, {
    headers: { Authorization: `Bearer ${env.CLAWQL_API_KEY}` },
  });
  if (!res.ok) throw new Error(`Gateway GET ${path} → ${res.status}`);
  return res.json();
}

async function gwPost(env, path, body) {
  const res = await fetch(`${env.CLAWQL_GATEWAY_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.CLAWQL_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gateway POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function recallMemory(env, userId, query) {
  try {
    const d = await gwPost(env, "/memory/recall", {
      query,
      topK: 8,
      filter: { userId, tool: "surveillance-challenge" },
    });
    return d.results?.map((r) => r.content).join("\n\n") || null;
  } catch (e) {
    console.warn("Memory recall:", e.message);
    return null;
  }
}

async function searchOnyx(env, query) {
  try {
    const d = await gwPost(env, "/docs/search", { query, limit: 5 });
    return d.results?.map((r) => r.content).join("\n\n") || null;
  } catch (e) {
    console.warn("Onyx search:", e.message);
    return null;
  }
}

async function ingestMemory(env, userId, sessionId, content, tags = []) {
  try {
    await gwPost(env, "/memory/ingest", {
      content,
      metadata: {
        userId,
        sessionId,
        tool: "surveillance-challenge",
        tags: ["surveillance-challenge", `user:${userId}`, ...tags],
        timestamp: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.warn("Memory ingest:", e.message);
  }
}

async function gwChat(env, system, userMsg) {
  const d = await gwPost(env, "/v1/chat/completions", {
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: userMsg }],
  });
  return d.choices?.[0]?.message?.content || d.content?.find((b) => b.type === "text")?.text || "";
}

// ─── Entitlement ──────────────────────────────────────────────────────────────

async function getEntitlement(env, userId, email, { testAuth = false } = {}) {
  // Local/demo tokens must not be blocked by the free-generation gate.
  if (testAuth) {
    return {
      entitled: true,
      generationsUsed: 0,
      generationsAllowed: Infinity,
      isPD: false,
      testAuth: true,
    };
  }
  // Public defender whitelist — checked before gateway entitlement
  // Set via: wrangler kv:key put --binding=RATE_LIMIT_KV "pd_whitelist:{email}" "true"
  if (email) {
    try {
      const pdKey = `pd_whitelist:${email.toLowerCase()}`;
      const isPD = await env.RATE_LIMIT_KV.get(pdKey);
      if (isPD === "true") {
        return { entitled: true, generationsUsed: 0, generationsAllowed: Infinity, isPD: true };
      }
    } catch {}
  }
  try {
    return await gwGet(env, `/payments/entitlement/${userId}`);
  } catch {
    return { entitled: false, generationsUsed: 0, generationsAllowed: FREE_GENERATIONS };
  }
}
async function getFreeUsed(env, userId) {
  try {
    const v = await env.RATE_LIMIT_KV.get(`free:${userId}`, { type: "json" });
    return v?.count || 0;
  } catch (e) {
    console.warn("getFreeUsed:", e.message);
    return 0;
  }
}
async function incrementFree(env, userId) {
  try {
    const c = await getFreeUsed(env, userId);
    await env.RATE_LIMIT_KV.put(`free:${userId}`, JSON.stringify({ count: c + 1 }), {
      expirationTtl: FREE_TTL_S,
    });
  } catch (e) {
    console.warn("incrementFree:", e.message);
  }
}

// ─── Document generation ──────────────────────────────────────────────────────

async function generateAllDocs(env, system, ctx, enriched, vendorName, profile) {
  if (wantsOfflineGeneration(env)) {
    return buildOfflineDocs({ vendorName, profile, ctx, enriched });
  }

  const base = `
Vendor: ${vendorName}
Camera / footage type: ${ctx.cameraType || "surveillance camera footage"}
Case: ${ctx.caseNumber} | ${ctx.defendant} | ${ctx.court} | ${ctx.jurisdiction}
${enriched}`;

  const [motion, accuracy, access, civil] = await Promise.all([
    // Vector 1: Authentication / FRE 901
    gwChat(
      env,
      system,
      `Draft a motion in limine to exclude ${vendorName} surveillance footage on authentication grounds under FRE 901.
${base}
Requirements:
1. Caption block with full case details
2. Introduction stating the specific relief sought
3. Factual background: what ${vendorName} is, what footage is at issue, how prosecution intends to use it
4. Legal standard under FRE 901(a) and 901(b)(9) — process or system reliability
5. Argument establishing the system lacks: (a) cryptographic hash of footage computed within camera hardware at capture, (b) Merkle-chained audit logs, (c) external immutable anchoring of Merkle roots, (d) tamper-evident access logs for all queries regardless of case number
6. Section on commercial availability of undetectable footage alteration — reference Toka (Haaretz 2022) as the documented baseline risk applicable to any vendor whose footage cannot be independently authenticated
7. Ten specific discovery requests targeting ${vendorName}'s integrity controls
8. Prayer for relief: exclusion, or in the alternative a Daubert-style hearing requiring ${vendorName} to demonstrate cryptographic integrity controls through live independent verification
9. Signature block placeholder
Write the complete motion. Number all argument paragraphs.`
    ),

    // Vector 2: Accuracy / FRE 702 / Daubert
    gwChat(
      env,
      system,
      `Draft a motion challenging the reliability of ${vendorName} AI surveillance technology under FRE 702 and Daubert v. Merrell Dow Pharmaceuticals.
${base}
Requirements:
1. Caption block with full case details
2. Introduction: this motion challenges admissibility of AI-generated surveillance evidence on reliability grounds independent of the authentication challenge
3. Legal standard: FRE 702 requires that testimony or evidence based on scientific, technical, or other specialized knowledge meet reliability standards; Daubert requires the court to act as gatekeeper; this applies to AI-generated evidence and to the systems that produce identification matches
4. The error rate problem: document the approximately 10% plate misread rate (2019 estimate, DHS 2025 market survey acknowledgment), at least 27 documented wrongful stops and detentions from ALPR errors since 2018 (Institute for Justice), and the Oak Park oversight board's 2025 finding that Flock cameras played no meaningful role in any crime investigation during three years of deployment
5. The proposed standard: evidence used to initiate stops, detentions, or criminal prosecutions should meet a minimum reliability threshold of no worse than 1 error per 1,000 reads (0.1%) — two orders of magnitude better than current documented industry performance — independently verified by a neutral third party
6. Argument that ${vendorName} cannot demonstrate its system meets this standard through independent testing, and that no court has established what the acceptable error rate is for AI-generated surveillance evidence used in criminal prosecution
7. Specific examples from the documented record of wrongful stops and detentions arising from character confusion errors (zero/O, one/I, H/M, 2/7, etc.)
8. Ten specific discovery requests targeting accuracy testing, error rate data, independent validation studies, and internal quality metrics for ${vendorName}'s system
9. Prayer for relief: exclusion, or in the alternative an evidentiary hearing requiring ${vendorName} to produce independent accuracy testing data
10. Signature block placeholder
Write the complete motion. Number all argument paragraphs.`
    ),

    // Vector 3: Access abuse / suppression
    gwChat(
      env,
      system,
      `Draft a motion to suppress evidence obtained through ${vendorName} surveillance on Fourth Amendment grounds, focusing on unauthorized access and lack of documented law enforcement purpose.
${base}
Additional facts about this specific search (if provided by user): ${ctx.searchFacts || "not specified — draft to address the general pattern and include discovery requests to establish the specific facts"}
Requirements:
1. Caption block with full case details
2. Introduction: evidence obtained through an unconstitutional search must be suppressed under the exclusionary rule
3. Legal standard: Fourth Amendment protection against unreasonable searches; ALPR queries constitute a search when used to initiate stops or investigations; warrantless use requires a legitimate law enforcement purpose; evidence from unconstitutional searches is suppressible under Mapp v. Ohio and progeny
4. The access abuse pattern: at least 28 documented cases of officers using ALPR systems to conduct searches for personal rather than law enforcement purposes (Institute for Justice, 2024–2026); specific documented cases by name, jurisdiction, and conduct; the finding that 84% of searches in FOIA-derived Flock audit logs carry no case number making unauthorized personal use structurally undetectable
5. Argument that without a documented case number, stated law enforcement purpose, and verifiable chain of authorization, the search that produced the evidence against this defendant cannot be distinguished from the documented pattern of unauthorized personal use
6. Argument that the systemic failure of access controls — evidenced by the documented abuse pattern and the absence of cryptographic audit trails — taints the reliability of access logs offered to justify the search
7. Ten specific discovery requests: the searching officer's complete query history for the 90 days surrounding the search; all queries the officer ran without a case number; any prior complaints or investigations into the officer's ALPR use; department policy on documentation requirements; audit logs for this specific query with full metadata
8. Prayer for relief: suppression of all evidence obtained through or derived from the ${vendorName} search
9. Signature block placeholder
Write the complete motion. Number all argument paragraphs.`
    ),

    // Vector 4: Civil damages / Section 1983
    gwChat(
      env,
      system,
      `Draft a Section 1983 civil rights demand letter on behalf of a person wrongfully stopped, detained, surveilled, or harmed through ${vendorName} surveillance technology.
${base}
Nature of harm (if provided): ${ctx.civilHarm || "wrongful stop and detention based on ALPR misidentification — adapt to facts provided"}
Requirements:
1. Formal demand letter format: date, addressee (city/county attorney and police department), re line, opening statement of claim
2. Statement of facts: what happened to the client, when, where, by which officers/agency, based on what ${vendorName} output
3. Legal basis:
   - Fourth Amendment violation: unreasonable seizure without probable cause or based on AI system output that does not meet reliability standards
   - 42 U.S.C. § 1983: deprivation of constitutional rights under color of state law
   - State tort claims as applicable: false arrest, false imprisonment, intentional infliction of emotional distress
4. Damages section:
   - Compensatory: detention time (calculated at an hourly rate), lost wages, medical expenses if any, property damage if any
   - Non-economic: emotional distress, humiliation, reputational harm, ongoing anxiety
   - Punitive: where officer conduct was reckless or malicious
   - Attorney's fees under 42 U.S.C. § 1988
   - Reference settlement ranges: $10,000–$75,000 for brief detentions; $100,000–$500,000+ for prolonged detention, physical harm, or egregious conduct
5. Reference to applicable qualified immunity landscape: note states where qualified immunity has been abolished or limited (Colorado, New Mexico) and states with active reform legislation (California, Washington)
6. Demand: specific dollar amount or demand for meaningful settlement negotiation; preservation of all records including the specific ${vendorName} query, audit logs, officer query history, and camera footage; response deadline of 30 days
7. Notice that failure to respond will result in filing of a Section 1983 complaint in federal district court
8. Closing and signature block placeholder
9. CC line: local ACLU, Institute for Justice, relevant civil rights organizations
Write the complete demand letter in formal legal correspondence format.`
    ),
  ]);

  return { motion, accuracy, access, civil };
}

// ─── Route handlers ───────────────────────────────────────────────────────────

async function handleCheckout(request, env) {
  let user;
  try {
    user = await resolveUser(request, env);
  } catch (e) {
    return json({ error: `Auth failed: ${e.message}` }, 401);
  }
  if (user.testAuth) {
    return json({ error: "Checkout disabled under test auth" }, 400);
  }
  let body = {};
  try {
    body = await request.json();
  } catch {}
  try {
    const data = await gwPost(env, "/payments/stripe/checkout", {
      userId: user.userId,
      email: user.email,
      name: user.name,
      successUrl: body.successUrl || `${body.origin || "https://yourapp.com"}?payment=success`,
      cancelUrl: body.cancelUrl || `${body.origin || "https://yourapp.com"}?payment=cancelled`,
      mode: "payment",
      productName: "Surveillance Evidence Challenge — Document Set",
      unitAmount: 900,
      currency: "usd",
    });
    return json({ checkoutUrl: data.checkoutUrl });
  } catch (e) {
    return json({ error: `Checkout failed: ${e.message}` }, 500);
  }
}

async function handleEntitlement(request, env) {
  let user;
  try {
    user = await resolveUser(request, env);
  } catch (e) {
    return json({ error: `Auth failed: ${e.message}` }, 401);
  }
  const ent = await getEntitlement(env, user.userId, user.email, { testAuth: !!user.testAuth });
  const freeUsed = await getFreeUsed(env, user.userId);
  return json({
    entitled: ent.entitled,
    isPD: ent.isPD || false,
    generationsUsed: ent.generationsUsed,
    generationsAllowed: ent.generationsAllowed,
    freeUsed,
    freeAllowed: FREE_GENERATIONS,
    canGenerate: ent.entitled || freeUsed < FREE_GENERATIONS,
    testAuth: !!user.testAuth,
  });
}

async function handleGenerate(request, env) {
  let user;
  try {
    user = await resolveUser(request, env);
  } catch (e) {
    return json({ error: `Auth failed: ${e.message}` }, 401);
  }

  const ent = await getEntitlement(env, user.userId, user.email, { testAuth: !!user.testAuth });
  const freeUsed = await getFreeUsed(env, user.userId);
  if (!ent.entitled && freeUsed >= FREE_GENERATIONS) {
    return json(
      {
        error: "payment_required",
        message: "Free generation used. Purchase access to generate more.",
        freeUsed,
        freeAllowed: FREE_GENERATIONS,
      },
      402
    );
  }

  let form;
  try {
    form = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  if (!form.tosAccepted) return json({ error: "tos_required" }, 400);

  const profile = VENDORS[form.vendor] || null;
  const vendorName = profile?.name || form.customVendorName || "the surveillance vendor";
  const system = buildSystemPrompt(form.vendor, {
    name: form.customVendorName,
    additionalVendorFacts: form.additionalVendorFacts,
  });

  const offline = wantsOfflineGeneration(env);
  const [memoryContext, onyxContext] = offline
    ? [null, null]
    : await Promise.all([
        recallMemory(
          env,
          user.userId,
          `surveillance evidence challenge ${vendorName} ${form.jurisdiction || ""} ${form.court || ""}`
        ),
        searchOnyx(
          env,
          `FRE 901 702 Daubert surveillance ALPR wrongful arrest civil rights ${vendorName} ${form.jurisdiction || ""}`
        ),
      ]);

  const enriched = [
    memoryContext ? `RECALLED CONTEXT:\n${memoryContext}` : "",
    onyxContext ? `ONYX KNOWLEDGE:\n${onyxContext}` : "",
    form.additionalFacts ? `ADDITIONAL FACTS:\n${form.additionalFacts}` : "",
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");

  const ctx = {
    caseNumber: form.caseNumber || "to be assigned",
    defendant: form.defendant || "the defendant",
    court: form.court || "the relevant court",
    jurisdiction: form.jurisdiction || "the relevant jurisdiction",
    city: form.city || "the relevant city",
    contractDate: form.contractDate || "the contract date",
    councilMember: form.councilMember || "Council Member",
    cameraType: form.cameraType || "",
    searchFacts: form.searchFacts || "",
    civilHarm: form.civilHarm || "",
  };

  let docs;
  try {
    docs = await generateAllDocs(env, system, ctx, enriched, vendorName, profile);
  } catch (e) {
    return json({ error: `Generation failed: ${e.message}` }, 500);
  }

  const sessionId = `surv-${user.userId}-${Date.now()}`;
  const disclaimer = buildDisclaimer(sessionId, vendorName);
  docs.motion = disclaimer + docs.motion;
  docs.accuracy = disclaimer + docs.accuracy;
  docs.access = disclaimer + docs.access;
  docs.civil = disclaimer + docs.civil;

  if (!ent.entitled) await incrementFree(env, user.userId);

  if (!offline) {
    await ingestMemory(
      env,
      user.userId,
      sessionId,
      `# Surveillance Challenge — ${new Date().toISOString()}\nVendor: ${vendorName}\nCase: ${ctx.caseNumber} | ${ctx.defendant} | ${ctx.court}\nJurisdiction: ${ctx.jurisdiction} | City: ${ctx.city}\n\n## Motion Summary\n${docs.motion.slice(0, 400)}...`.trim(),
      [vendorName, ctx.jurisdiction, ctx.city].filter(Boolean)
    );
  }

  return json({
    sessionId,
    docs,
    meta: {
      user: { email: user.email },
      vendorName,
      memoryContextUsed: !!memoryContext,
      onyxContextUsed: !!onyxContext,
      entitled: ent.entitled,
      generationMode: offline ? "offline" : "gateway",
      testAuth: !!user.testAuth,
    },
  });
}

async function handleHistory(request, env) {
  let user;
  try {
    user = await resolveUser(request, env);
  } catch (e) {
    return json({ error: `Auth failed: ${e.message}` }, 401);
  }
  const results = await recallMemory(env, user.userId, "surveillance challenge session");
  return json({
    sessions: (results ? results.split("\n\n") : [])
      .slice(0, 10)
      .map((r, i) => ({ index: i, preview: r.slice(0, 200) })),
  });
}

async function handleSession(request, env, sessionId) {
  let user;
  try {
    user = await resolveUser(request, env);
  } catch (e) {
    return json({ error: `Auth failed: ${e.message}` }, 401);
  }
  const results = await recallMemory(env, user.userId, `session:${sessionId}`);
  if (!results) return json({ error: "Session not found" }, 404);
  return json({ content: results });
}

// ─── Evidence (web / Witness) — Stripe for docs; ClawQL anchors behind the scenes ─

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function handleEvidenceSecure(request, env) {
  let user;
  try {
    user = await resolveUser(request, env);
  } catch (e) {
    return json({ error: `Auth failed: ${e.message}` }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { transcriptHash, audioHash, videoHash } = body;
  if (!transcriptHash || !audioHash || !videoHash) {
    return json({ error: "transcriptHash, audioHash, and videoHash are required" }, 400);
  }

  const sessionId = `ev-${user.userId.slice(0, 12)}-${Date.now().toString(36)}`;
  const record = await persistEvidenceRecord(env, {
    sessionId,
    userId: user.userId,
    email: user.email,
    transcriptHash,
    audioHash,
    videoHash,
    transcriptText: body.transcriptText,
    mimeType: body.mimeType,
    startedAt: body.startedAt,
    endedAt: body.endedAt,
    stateCode: body.stateCode,
    source: body.source || "web",
    claimable: false,
  });

  return json({
    sessionId: record.sessionId,
    status: record.status,
    merkleRoot: record.merkleRoot,
    securedAt: record.securedAt,
    verificationId: record.sessionId,
  });
}

/**
 * Native / emergency path: record without Google mid-encounter.
 * Returns a one-time claimCode so the user can attach the session after sign-in.
 */
async function handleEvidenceSecureDevice(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { deviceId, transcriptHash, audioHash, videoHash } = body;
  if (!deviceId || !transcriptHash || !audioHash || !videoHash) {
    return json({ error: "deviceId, transcriptHash, audioHash, and videoHash are required" }, 400);
  }

  const sessionId = `ev-dev-${String(deviceId).slice(0, 8)}-${Date.now().toString(36)}`;
  const claimCode = randomClaimCode();
  const claimCodeHash = await sha256Hex(claimCode);

  const record = await persistEvidenceRecord(env, {
    sessionId,
    userId: null,
    email: null,
    deviceId: String(deviceId),
    transcriptHash,
    audioHash,
    videoHash,
    transcriptText: body.transcriptText,
    mimeType: body.mimeType,
    startedAt: body.startedAt,
    endedAt: body.endedAt,
    stateCode: body.stateCode,
    source: body.source || "native",
    claimable: true,
    claimCodeHash,
    location: body.location || null,
  });

  try {
    await env.RATE_LIMIT_KV.put(
      `device:${deviceId}`,
      JSON.stringify({ deviceId, lastSessionId: sessionId, seenAt: new Date().toISOString() }),
      { expirationTtl: 60 * 60 * 24 * 365 * 5 }
    );
  } catch (e) {
    console.warn("device registry:", e.message);
  }

  return json({
    sessionId: record.sessionId,
    status: record.status,
    merkleRoot: record.merkleRoot,
    securedAt: record.securedAt,
    verificationId: record.sessionId,
    claimCode,
    claimUrl: `https://challengethefootage.com/evidence.html?claim=${encodeURIComponent(sessionId)}&code=${encodeURIComponent(claimCode)}`,
  });
}

async function handleEvidenceClaim(request, env) {
  let user;
  try {
    user = await resolveUser(request, env);
  } catch (e) {
    return json({ error: `Auth failed: ${e.message}` }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { sessionId, claimCode } = body;
  if (!sessionId || !claimCode) {
    return json({ error: "sessionId and claimCode are required" }, 400);
  }

  let record;
  try {
    const raw = await env.RATE_LIMIT_KV.get(`evidence:${sessionId}`);
    if (!raw) return json({ error: "Not found" }, 404);
    record = JSON.parse(raw);
  } catch (e) {
    return json({ error: e.message }, 500);
  }

  if (record.userId && record.userId !== user.userId) {
    return json({ error: "Evidence already linked to another account" }, 409);
  }
  if (record.userId === user.userId) {
    return json({ sessionId, status: record.status, alreadyClaimed: true });
  }
  if (!record.claimable || !record.claimCodeHash) {
    return json({ error: "This session cannot be claimed" }, 400);
  }

  const givenHash = await sha256Hex(String(claimCode));
  if (givenHash !== record.claimCodeHash) {
    return json({ error: "Invalid claim code" }, 403);
  }

  record.userId = user.userId;
  record.email = user.email;
  record.claimable = false;
  record.claimCodeHash = null;
  record.claimedAt = new Date().toISOString();

  try {
    await env.RATE_LIMIT_KV.put(`evidence:${sessionId}`, JSON.stringify(record), {
      expirationTtl: 60 * 60 * 24 * 365 * 5,
    });
    await appendEvidenceIndex(env, user.userId, {
      sessionId,
      securedAt: record.securedAt,
      status: record.status,
      source: record.source,
      claimedAt: record.claimedAt,
    });
  } catch (e) {
    return json({ error: `Failed to claim: ${e.message}` }, 500);
  }

  return json({
    sessionId,
    status: record.status,
    claimedAt: record.claimedAt,
    verificationId: sessionId,
  });
}

function randomClaimCode() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function persistEvidenceRecord(env, input) {
  const securedAt = new Date().toISOString();
  const merkleRoot = await sha256Hex(
    `${input.transcriptHash}:${input.audioHash}:${input.videoHash}`
  );

  let status = "secured";
  let verificationRef = null;
  if (env.CLAWQL_GATEWAY_URL && env.CLAWQL_API_KEY && env.GENERATION_MODE !== "offline") {
    try {
      const anchored = await gwPost(env, "/surveillance/witness/anchor", {
        sessionId: input.sessionId,
        userId: input.userId,
        email: input.email,
        deviceId: input.deviceId,
        merkleRoot,
        transcriptHash: input.transcriptHash,
        audioHash: input.audioHash,
        videoHash: input.videoHash,
        source: input.source,
        startedAt: input.startedAt,
        endedAt: input.endedAt || securedAt,
        stateCode: input.stateCode,
      });
      verificationRef = anchored.arweaveTxId || anchored.txId || anchored.id || null;
      if (verificationRef) status = "anchored";
    } catch (e) {
      console.warn("Evidence anchor via ClawQL:", e.message);
      status = "secured_pending_anchor";
    }
  } else {
    status = "secured_local";
  }

  const record = {
    sessionId: input.sessionId,
    userId: input.userId,
    email: input.email,
    deviceId: input.deviceId || null,
    transcriptHash: input.transcriptHash,
    audioHash: input.audioHash,
    videoHash: input.videoHash,
    merkleRoot,
    status,
    verificationRef,
    source: input.source || "web",
    stateCode: input.stateCode || null,
    startedAt: input.startedAt || null,
    endedAt: input.endedAt || securedAt,
    securedAt,
    mimeType: input.mimeType || null,
    location: input.location || null,
    claimable: !!input.claimable,
    claimCodeHash: input.claimCodeHash || null,
  };

  try {
    await env.RATE_LIMIT_KV.put(`evidence:${input.sessionId}`, JSON.stringify(record), {
      expirationTtl: 60 * 60 * 24 * 365 * 5,
    });
    if (input.userId) {
      await appendEvidenceIndex(env, input.userId, {
        sessionId: input.sessionId,
        securedAt,
        status,
        source: record.source,
      });
    }
  } catch (e) {
    console.warn("Evidence KV store:", e.message);
  }

  if (input.transcriptText && input.userId && !wantsOfflineGeneration(env)) {
    await ingestMemory(
      env,
      input.userId,
      input.sessionId,
      `# Evidence session ${input.sessionId}\nStatus: ${status}\nNotes:\n${String(input.transcriptText).slice(0, 2000)}`,
      ["evidence", record.source].filter(Boolean)
    );
  }

  return record;
}

async function appendEvidenceIndex(env, userId, entry) {
  const indexKey = `evidence-index:${userId}`;
  let index = [];
  try {
    index = (await env.RATE_LIMIT_KV.get(indexKey, { type: "json" })) || [];
  } catch {
    index = [];
  }
  if (!Array.isArray(index)) index = [];
  index = index.filter((e) => e.sessionId !== entry.sessionId);
  index.unshift(entry);
  await env.RATE_LIMIT_KV.put(indexKey, JSON.stringify(index.slice(0, 100)), {
    expirationTtl: 60 * 60 * 24 * 365 * 5,
  });
}

async function handleEvidenceSessions(request, env) {
  let user;
  try {
    user = await resolveUser(request, env);
  } catch (e) {
    return json({ error: `Auth failed: ${e.message}` }, 401);
  }
  try {
    const index =
      (await env.RATE_LIMIT_KV.get(`evidence-index:${user.userId}`, { type: "json" })) || [];
    return json({ sessions: Array.isArray(index) ? index : [] });
  } catch (e) {
    return json({ sessions: [], warning: e.message });
  }
}

async function handleEvidenceVerify(request, env, sessionId) {
  if (!sessionId) return json({ error: "Missing session id" }, 400);
  try {
    const raw = await env.RATE_LIMIT_KV.get(`evidence:${sessionId}`);
    if (!raw) return json({ error: "Not found" }, 404);
    const record = JSON.parse(raw);
    return json({
      sessionId: record.sessionId,
      status: record.status,
      securedAt: record.securedAt,
      transcriptHash: record.transcriptHash,
      audioHash: record.audioHash,
      videoHash: record.videoHash,
      merkleRoot: record.merkleRoot,
      source: record.source,
      claimable: !!record.claimable,
      independentlyVerifiable: record.status === "anchored",
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
