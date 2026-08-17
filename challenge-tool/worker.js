/**
 * Surveillance Evidence Challenge Tool — Cloudflare Worker
 *
 * Six attack vectors (four generated document types; Vectors 5–6 enrich civil / suppression):
 *   1. Authentication (FRE 901) — no Merkle chain, no hash at capture; Condor open-internet exposure (ops-sec)
 *   2. Accuracy (FRE 702 / Daubert) — ~10% OCR; Roseville 71% alert misreads; LAPD OIG 32.3% hot-list FPs
 *   3. Access abuse + Fourth Amendment — IJ ALPR Abuse DB (146); stalking; tower-dump analogy; MYOC
 *   4. Civil damages — Section 1983 / Fourth Amendment demand letter
 *   5. First Amendment retaliation — Lenexa MYOC pattern, Nieves exception (folds into civil)
 *   6. Drone surveillance — Kyllo / Carpenter / Jones curtilage (folds into suppression / civil)
 *
 * Routes:
 *   POST /api/checkout
 *   GET  /api/entitlement
 *   POST /api/generate
 *   GET  /api/history
 *   GET  /api/session/:id
 *   POST /api/extract-case
 *   GET  /api/health
 *
 * Also: Link headers, Markdown negotiation (Accept: text/markdown), agent-ready well-known files.
 *
 * Local/dev testing (see .dev.vars.example):
 *   ALLOW_TEST_AUTH=true  + Authorization: Bearer test:<userId>:<email>
 *   GENERATION_MODE=offline  (or omit CLAWQL_* secrets) → deterministic templates
 */

import { buildOfflineDocs } from "./offline-docs.js";
import { extractCaseFacts } from "./case-extract.js";
import {
  FOOTAGE_CATEGORY_IDS,
  bodyCamRatchetLine,
  getFootageCategory,
  normalizeBodyCamRecordingStatus,
  resolveFootageProfile,
} from "./footage-modes.js";
import { evidenceMerkleRoot, randomClaimCode, sha256Hex } from "./evidence-crypto.js";
import { gunzipBase64ToText } from "./evidence-gzip.js";
import { r2Configured, r2PutObject } from "./r2.js";
import {
  INCIDENT_TTL,
  applyPeerTimeouts,
  emptyIncident,
  publicIncidentView,
  randomIncidentCode,
  incidentKvKey,
} from "./incident.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Device-Id, X-Claim-Code, X-Content-SHA256",
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
  "/site.webmanifest": "application/manifest+json; charset=utf-8",
  "/sw.js": "application/javascript; charset=utf-8",
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
  if (pathname === "/media.html" || pathname === "/media") return "/media.md";
  return null;
}

/** Browser-facing .html → clean path (files still live as *.html in Assets). */
function htmlExtensionRedirect(pathname) {
  if (pathname === "/index.html") return "/";
  if (
    pathname === "/evidence.html" ||
    pathname === "/media.html" ||
    pathname === "/terms.html" ||
    pathname === "/public-defenders.html"
  ) {
    return pathname.replace(/\.html$/i, "");
  }
  return null;
}

/** Map clean URL paths to static HTML files when Assets HTML handling is off. */
function htmlAssetPath(pathname) {
  if (pathname === "/" || pathname === "") return "/index.html";
  if (pathname === "/evidence") return "/evidence.html";
  if (pathname === "/media") return "/media.html";
  if (pathname === "/terms") return "/terms.html";
  if (pathname === "/public-defenders") return "/public-defenders.html";
  return null;
}

function isRedirectStatus(status) {
  return status === 301 || status === 302 || status === 307 || status === 308;
}

/** Fresh GET to Assets — do not forward the browser Request (URL/redirect quirks). */
async function fetchAssetPath(env, origin, pathname) {
  return env.ASSETS.fetch(new Request(new URL(pathname, origin).toString(), { method: "GET" }));
}

/**
 * Resolve an asset to a 200 response.
 * Critical: when Assets 307s /index.html → /, follow Location AS-IS.
 * Remapping / → /index.html again creates a redirect loop (blank iOS Safari).
 */
async function fetchAssetOk(env, origin, pathname) {
  const seen = new Set();
  let path = pathname || "/";
  for (let i = 0; i < 4; i++) {
    if (seen.has(path)) break;
    seen.add(path);
    const response = await fetchAssetPath(env, origin, path);
    if (response.status === 200) return { response, path };
    if (!isRedirectStatus(response.status)) {
      return { response, path };
    }
    const loc = response.headers.get("Location");
    if (!loc) return { response, path };
    path = new URL(loc, origin).pathname || "/";
  }
  return { response: await fetchAssetPath(env, origin, pathname), path: pathname };
}

async function serveAssets(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname || "/";

  if (request.method === "GET" && wantsMarkdown(request)) {
    const mdPath = markdownAssetPath(pathname);
    if (mdPath) {
      const mdResponse = await fetchAssetPath(env, url.origin, mdPath);
      if (mdResponse.status === 200) {
        const headers = new Headers(mdResponse.headers);
        headers.set("Link", AGENT_LINK_HEADER);
        headers.set("Vary", mergeVary(headers.get("Vary"), "Accept"));
        headers.set("Content-Type", "text/markdown; charset=utf-8");
        return new Response(mdResponse.body, {
          status: 200,
          statusText: mdResponse.statusText,
          headers,
        });
      }
    }
  }

  // Try file path (html_handling=none) then canonical pretty path (default HTML handling).
  const mapped = htmlAssetPath(pathname);
  const candidates = [];
  if (mapped) {
    candidates.push(mapped, pathname === "" ? "/" : pathname);
  } else if (pathname.endsWith(".html")) {
    candidates.push(pathname, pathname.replace(/\.html$/i, "") || "/");
  } else {
    candidates.push(pathname);
    if (pathname !== "/" && !pathname.endsWith("/")) candidates.push(`${pathname}.html`);
  }
  // Always end with known shells so `/` cannot stay broken.
  for (const fallback of ["/index.html", "/"]) {
    if (!candidates.includes(fallback)) candidates.push(fallback);
  }

  let response = null;
  let assetPath = pathname;
  for (const candidate of candidates) {
    const result = await fetchAssetOk(env, url.origin, candidate);
    response = result.response;
    assetPath = result.path;
    if (response.status === 200) break;
  }

  // Never hand Asset redirects to browsers (empty body + Location → blank mobile page).
  if (!response || isRedirectStatus(response.status)) {
    const headers = new Headers({
      "Content-Type": "text/html; charset=utf-8",
      Link: AGENT_LINK_HEADER,
      Vary: "Accept",
    });
    return new Response(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Challenge the Footage</title></head><body><p>Loading failed. <a href="/">Retry</a>.</p></body></html>',
      { status: 503, headers }
    );
  }

  const headers = new Headers(response.headers);
  headers.set("Link", AGENT_LINK_HEADER);
  headers.set("Vary", mergeVary(headers.get("Vary"), "Accept"));
  headers.delete("Location");

  const path = assetPath;
  if (CONTENT_TYPE_OVERRIDES[path]) {
    headers.set("Content-Type", CONTENT_TYPE_OVERRIDES[path]);
  } else if (path.endsWith(".md")) {
    headers.set("Content-Type", "text/markdown; charset=utf-8");
  }

  const contentType = headers.get("Content-Type") || "";
  const isHtml = contentType.includes("text/html") || path.endsWith(".html") || path === "/";
  // Prevent edge cache from storing redirect/error variants that blank mobile Safari.
  if (isHtml && response.status === 200) {
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    headers.set("CDN-Cache-Control", "no-store");
  }
  if (path === "/sw.js" && response.status === 200) {
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    headers.set("CDN-Cache-Control", "no-store");
    headers.set("Service-Worker-Allowed", "/");
  }

  // Inject head bootstrapping for HTML shells.
  if (response.status === 200 && isHtml) {
    const parts = [];
    // Tear down any leftover SW that blanked iOS navigations.
    parts.push(
      `<script>(function(){try{if(!("serviceWorker"in navigator))return;navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(x){x.unregister();});});if(window.caches)caches.keys().then(function(k){k.forEach(function(n){caches.delete(n);});});}catch(e){}})();</script>`
    );
    if (env.GOOGLE_CLIENT_ID) {
      const clientId = String(env.GOOGLE_CLIENT_ID).replace(/</g, "\\u003c");
      parts.push(`<script>window.GOOGLE_CLIENT_ID=${JSON.stringify(clientId)};</script>`);
    }
    const inject = parts.join("");
    return new HTMLRewriter()
      .on("head", {
        element(el) {
          el.prepend(inject, { html: true });
        },
      })
      .transform(
        new Response(response.body, {
          status: 200,
          statusText: "OK",
          headers,
        })
      );
  }

  // Force 200 for successful HTML shells even if Assets status was odd.
  const outStatus = response.status === 200 || (isHtml && response.ok) ? 200 : response.status;
  return new Response(response.body, {
    status: outStatus,
    statusText: outStatus === 200 ? "OK" : response.statusText,
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
      "The Institute for Justice Database of ALPR Abuse (published August 12, 2026; ij.org/the-ij-database-of-alpr-abuse) documents source-cited incidents in which plate misreads and misinterpreted alerts produced wrongful stops, detentions at gunpoint, and jailings — including character-confusion cases (O/0, 7/2, and similar) in Toledo, OH; Morristown, TN; Sherwood, AR; and Espanola, NM. Cite the database and primary sources rather than outdated 'at least 27' estimates.",
      "Roseville, California: Flock sent 1,427 alerts over 2023–2024 flagging cars as stolen or used in a felony. Department analysis found that in 71% of those alerts, the cameras read the plates incorrectly (1,011 misreads). This is a plate-misread rate on actionable felony/stolen alerts — upstream OCR accuracy before database matching — distinct from the LAPD OIG's 32.3% false-positive rate on hot-list alerts. Source: Business Insider (July 2026) citing Roseville PD records; IJ database entry.",
      "In 2025, an Oak Park, Illinois oversight board concluded: 'There is no evidence whatsoever that Flock Safety ALPRs have played a meaningful role in any Oak Park crime investigation since their installation in 2022.' Oak Park ended its Flock contract in August 2025.",
      "The LAPD Office of the Inspector General conducted an audit released July 10, 2026, examining Flock hot-list alerts over a two-month period (August–September 2025) during which LAPD operated nearly 2,000 Flock cameras. The audit found 161 false positives out of 498 total alerts — a 32.3% false positive rate. Every false alert resulted in officers conducting a traffic stop of an innocent driver whose vehicle had not been stolen. The Inspector General described the stop protocol: 'Often, officers will approach the vehicle with extreme caution or conduct a high-risk stop. This involves calling for back up, air support and a supervisor and ordering the suspect out of their vehicle.' The Inspector General warned: 'In addition to creating an inconvenience for vehicle owners, these inaccuracies can affect individual liberty interests, erode public trust, and potentially create substantial legal and financial liability concerns.' LAPD allowed its three-year contract to expire in July 2026 rather than renew it. 404 Media / Futurism / LAPD OIG, July 2026.",
      "The LAPD false positive rate is particularly significant because the failure was not camera misreads — the cameras read the plates correctly. The failure was stale database records: stolen vehicles recovered but never cleared from hotlists, outdated theft reports, and uncorrected data entry errors. This means the Daubert reliability argument applies to the system as a whole — cameras plus database plus alert mechanism — which is the unit that produces actionable outputs officers act on. A system that correctly reads plates but generates a 32.3% false positive rate on actionable alerts resulting in armed high-risk stops of innocent people does not meet the reliability standard FRE 702 requires for evidence or enforcement actions used in criminal prosecution.",
      "A Minnesota case documented by The Drive illustrates the consequences: a journalist and his wife were subjected to a high-risk stop by multiple officers while test-driving a Range Rover after Flock wrongly marked the vehicle as stolen. The Drive / Joel Feder, 2026.",
      "The LAPD is one of the largest police departments in the United States. Its Inspector General's documented finding of a 32.3% false positive rate on actionable hot-list alerts is official government evidence — not an advocacy estimate — that Flock's system as deployed does not meet a defensible reliability standard for enforcement actions. The LAPD's contract non-renewal on accuracy and privacy grounds is among the most significant institutional rejections of Flock to date.",
    ],
    accessAbuseFacts: [
      "The Institute for Justice published a database of 146 documented ALPR abuse incidents on August 12, 2026, at ij.org/the-ij-database-of-alpr-abuse — the day before Flock Safety announced its mandatory 'guardrails' changes (August 13, 2026). The database is source-cited to primary records for every incident and is actively maintained. Categories include stalking (officers tracking romantic partners, family members, and romantic rivals), errors (misread plates and misinterpreted alerts resulting in wrongful stops and detentions), non-law-enforcement use (personal searches unrelated to any investigation), and other misuse (unauthorized data sharing, evidence tampering, and policy violations). The IJ database is the authoritative reference for documented ALPR abuse and should be cited in every motion involving ALPR evidence.",
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
      "In April 2025, Wisconsin police used Flock hits along Interstate 41 to track Edward Abrams-Phillips from Wisconsin into Michigan (where marijuana is legal) and back, then cited his frequent Michigan travel — described in the charging document as travel to a 'known source state for marijuana' — as part of the probable cause justification to search his car for weed. The bail-jumping charge that initiated the investigation was dismissed; he was found guilty only of marijuana possession (State v. Abrams-Phillips court records via 404 Media, August 5–6, 2026). This is travel-pattern / pretext-stop surveillance — not a single hotlist hit.",
      "Wapello County, Iowa's November 2025 standard operating procedures for Flock cameras instruct officers: 'DO NOT MENTION ALPR USAGE TO THE OCCUPANTS OF THE VEHICLE. DO NOT MENTION ALPR USAGE IN YOUR REPORT OR COMPLAINT UNLESS ABSOLUTELY NECESSARY,' and advise referring to Flock as 'county resources' and treating ALPR information 'like you would intelligence' (SOP obtained via public records request; 404 Media, August 4, 2026).",
      "404 Media reported that FBI and Department of Justice guidance shared with police in multiple states advised officers to be 'as vague as permissible' about why they were using Flock, because Flock searches can be obtained via public records requests (referenced in 404 Media coverage, 2026).",
      "In December 2025, Georgia State Patrol used a Flock camera capture ('CAPTURED ON FLOCK CAMERA 31 MM 1 HOLDING PHONE IN LEFT HAND') as the basis for a traffic citation for holding a wireless device — despite many jurisdictions publicly claiming Flock cameras are not used for traffic enforcement or minor code violations (404 Media, August 2026; ticket later dropped).",
      "On August 5, 2026, U.S. District Judge Carlton W. Reeves (S.D. Miss.) affirmed denial of four FBI 'tower dump' warrant applications, holding tower dumps — collecting location data for every device that connected to specified cell towers near crime scenes so police can later sift for unknown suspects — are per se unconstitutional under the Fourth Amendment as general warrants. In re Four Applications for Search Warrants Seeking Information Associated with Particular Cellular Towers a/k/a Tower-Dump Warrants, No. 3:25-cr-00038 (S.D. Miss. Aug. 5, 2026) (order affirming magistrate denial), building on United States v. Smith, 110 F.4th 817 (5th Cir. 2024) (geofence warrants per se unconstitutional). ALPR networks like Flock passively collect vehicle location data on every vehicle that passes a camera and allow retroactive multi-hit sifting to build suspect profiles — a structurally analogous dragnet. Counsel in circuits following Carpenter / Smith should argue that warrantless ALPR queries used to reconstruct travel patterns require particularized probable cause under Carpenter v. United States, 585 U.S. 296 (2018).",
      "In Savannah, Georgia, six Savannah Police Department employees — four officers and two civilians — were placed on administrative leave in August 2026 after an internal audit found 34 unjustified searches among 127 flagged by SPD's audit-assist tool, including queries on personal acquaintances and family members; one officer allegedly gave an unauthorized outside agency access to the system (WTOC, August 3, 2026).",
      "In Mooresville, North Carolina, at least 10 officers were under investigation for Flock violations as of August 2026 (Union-Bulletin reporting, August 2026).",
      "First Amendment retaliation via ALPR is vendor-agnostic: Lenexa, Kansas tracked a columnist with Axon/Genetec/Leonardo cameras and a written 'MYOC' (make your own case) BOLO — not a Flock deployment. Any ALPR network that enables retroactive plate queries without mandatory documented justification can be used for retaliatory surveillance (KCUR, February–June 2026).",
      "In August 2026, Eagle Sports Range in Cudahy, Wisconsin confirmed that when it contacted Flock in February 2026 to request removal of its three cameras, Flock told the business it was 'contractually obligated' to keep the cameras in place and operating. The business removed the cameras anyway after a viral video circulated. General manager Saad Jaber stated: 'After the video circulated, we made a clear decision: we care more about the privacy of our customers than we do about a contract.' The cameras had been used once in two years — to help police investigate a single vehicle theft. TMJ4 / FOX6, August 2026.",
      "More than 220 law enforcement agencies in Wisconsin use Flock Safety camera technology. Two Milwaukee police employees were charged with misusing the technology for personal tracking: Det. Tehrangi Chapman and former MPD Officer Josue Ayala. Ayala was convicted and received a fine and probation. Wisconsin Watch / FOX6, 2026.",
      "Dane County, Wisconsin ended its Flock contract in 2026 following community pressure. UW-Madison faculty organized against eight Flock cameras installed on campus in July 2025. The ACLU of Wisconsin is advocating for local CCOPS ordinances where state law permits.",
      "In Wisconsin, state Act 12 preempts local governments from enacting Community Control Over Police Surveillance ordinances that would require elected officials to approve surveillance tools before deployment. Several Milwaukee council members have stated this law prevents them from restricting MPD's Flock camera use or setting standards for surveillance technology despite constituent pressure. This state preemption pattern — where Flock's lobbying has contributed to laws stripping local oversight authority — is documented in Wisconsin and appears in other states.",
      "ALPR cameras systematically log vehicles arriving at and departing from gun stores, gun shows, shooting ranges, and firearms training facilities. Chris McNutt has publicly characterized this pattern as creating 'a gun-owner registry built from your movements instead of a Form 4473' (reported August 2026). Attribute the characterization to its source when quoting; use it as a factual analogy for counsel — Form 4473 is the ATF firearms transaction record at point of sale, while ALPR location logs can identify visitors by movements without that statutory framework.",
      "Representative Tim Burchett (R-TN) introduced H.R. 9800 — the Protection Against Mass Surveillance Act — on July 21, 2026, which would ban federal agencies from purchasing, deploying, operating, accessing, or contracting for Flock Safety cameras and similar mass surveillance technologies. The bill was referred to the House Committee on Oversight and Government Reform. Cite bill number and sponsor as a legislative fact.",
      "Flock Safety spent $920,000 on federal lobbying in 2025 and another $230,000 in the first quarter of 2026 alone. Motorola Solutions spent more than $2 million in the same period (reported July 2026).",
      "Flock Safety's Alpha platform combines autonomous flight, aerial license plate recognition, thermal imaging, and live video with the company's existing police surveillance network, announced in 2026.",
      "In April 2026, the ACLU filed an amicus brief in a Fourth Circuit case arguing that ALPR systems give the government unprecedented surveillance powers that upset traditional expectations of privacy in violation of the Fourth Amendment. In May 2026, the ACLU supported a bipartisan amendment to the federal highway funding bill that would have prevented cities and states from using ALPR cameras except for tolling purposes. Cite the brief and legislative activity as public legal record, not as an organizational endorsement by this tool.",
    ],
    authFacts: [
      "Flock Safety's audit logs obtained via FOIA do not contain cryptographic hash values for footage segments and show no evidence of Merkle chaining or external immutable anchoring.",
      "Andreessen Horowitz (a16z) has funded both Flock Safety and Toka, an Israeli cyber firm co-founded by former Prime Minister Ehud Barak and former IDF cyber chief Yaron Rosen. Haaretz reported in 2022 based on internal documents that Toka sells technology capable of altering both live and archived camera feeds without leaving forensic traces.",
      "FBI and Homeland Security have accessed local Flock networks without clear awareness or approval from contracting localities.",
      "Wapello County, Iowa policy instructs officers not to mention ALPR usage in reports or complaints 'unless absolutely necessary,' making the ALPR basis for a stop structurally hidden from defendants, defense counsel, and courts — directly implicating Franks v. Delaware where material information is omitted from probable cause affidavits at the direction of departmental policy.",
      "Flock publicly states that customers own and control the data collected by its systems and that Flock does not claim ownership or use the data for its own purposes. The Eagle Sports Range case directly contradicts this: when a customer requested removal of cameras and termination of data collection, Flock cited contractual obligations to keep cameras operating. A customer who genuinely owned and controlled their data would be able to turn off collection on request. The contractual obligation to keep cameras running after a customer requests termination is evidence that Flock has an independent interest in the data stream not disclosed in its public ownership claims. This discrepancy is potentially actionable under FTC unfair and deceptive practices authority and, for California customers, under the CCPA.",
      "In December 2025, security researcher Benn Jordan and Jon 'GainSec' Gaines discovered that at least 60 of Flock Safety's AI-powered Condor PTZ cameras were left streaming live, unencrypted video to the open internet with no username, password, or authentication of any kind required — accessible via a simple search engine query. 404 Media independently verified the findings; a reporter drove to a California traffic signal and watched himself on camera in real time. The exposed cameras captured footage of playgrounds, parking lots, bike paths, trails, and people leaving their homes. Anyone with the IP address could: (1) watch real-time feeds; (2) download up to 30 days of archived footage; (3) access administrative controls and change device settings; (4) view log files and run diagnostics; and (5) delete recordings. 'None of the data or video footage was encrypted,' Jordan stated. 'There was no username or password required.' Flock described it as a 'limited misconfiguration on a very small number of devices' that had 'since been remedied' but did not disclose when the misconfiguration began or how long the cameras had been exposed. Senator Ron Wyden called for an FTC investigation. A class action — Gibbs Mura v. Flock Safety — was filed in San Francisco Superior Court in February 2026. 404 Media / 9News, December 2025.",
      "The Condor camera exposure is documented evidence that Flock footage chain of custody can be unreliable as criminal evidence. Because Flock did not disclose when the misconfiguration began — only that it had been remedied — the exposure window for any specific Condor camera is unknown. Any footage from a Condor camera offered as criminal evidence is subject to the argument that during the exposure window, which may have predated the December 2025 discovery by an unknown period, the footage was demonstrably accessible to unknown third parties with full administrative access including the ability to delete, alter, and modify settings and logs. The FRE 901 authentication argument for Condor footage is based on a documented, confirmed, publicly reported security failure — not solely on the absence of cryptographic controls.",
      "Prior to the Condor exposure, Benn Jordan and Jon 'GainSec' Gaines also reported multiple vulnerabilities in Flock's ALPR license plate reader cameras that could allow anyone with physical access to the camera to obtain sensitive data. 404 Media, November 2025.",
      "404 Media reported that Flock may have relied on overseas contract workers to review and classify surveillance footage as part of its AI training processes, raising questions about who has had access to footage and whether that access was disclosed to contracting agencies. 404 Media / PetaPixel, 2025.",
      "In West Chester, Ohio, former officer Michelle Berling was convicted and sentenced to five years of probation for tampering with Flock data and images (August 2024). This is the only documented criminal conviction for evidence tampering using the Flock system. The conviction is direct evidence that Flock data and images are susceptible to deliberate manipulation by authorized system users — not only external attackers — and that such manipulation has occurred. Source: IJ Database of ALPR Abuse; WCPO reporting.",
      "In Millcreek, Utah (August 2026), city authorities discovered a Flock camera on city property and removed it after being unable to determine who installed it or who had access to it. An ALPR camera with an unknown installation chain and unknown access history cannot be authenticated as a reliable evidence source. Source: IJ Database of ALPR Abuse; KUTV reporting.",
    ],
    civilFacts: [
      "In October 2024, the Institute for Justice filed a federal lawsuit against the city of Norfolk, Virginia — the first civil ALPR lawsuit to survive a government motion to dismiss.",
      "IJ has filed a federal class action against San Jose, California, which operates 474 Flock Safety cameras conducting approximately 15,000 database searches per day against people never accused of any crime.",
      "Section 1983 provides a federal cause of action for deprivation of constitutional rights under color of state law. Wrongful stops and detentions based on ALPR misidentification implicate the Fourth Amendment right to be free from unreasonable seizures.",
      "Wrongful arrest settlements involving short detention without physical injury typically range from $10,000 to $75,000. Cases involving prolonged detention, lost employment, physical injury, or emotional trauma frequently reach $100,000 to $500,000 or more.",
      "Colorado and New Mexico have fully or partially abolished qualified immunity for state law claims as of 2026, and California and Washington have active legislation under consideration — eliminating the primary defense available to officers in those jurisdictions.",
      "Where ALPR tracking follows protected speech (criticism of police, protest, political leafleting) and is used to engineer pretextual stops — as documented in the Lenexa, Kansas 'MYOC' case on non-Flock systems — a parallel § 1983 First Amendment retaliation theory is available independent of Fourth Amendment claims (Nieves v. Bartlett, 2019).",
      "Where a person's plate was captured at a gun range, gun store, gun show, or firearms training facility, warrantless ALPR collection may implicate the Second Amendment legal standard alongside the Fourth. Under NYSRPA v. Bruen, 597 U.S. 1 (2022), the government bears the burden of demonstrating that any regulation of the right to keep and bear arms is consistent with historical tradition. There is no historical tradition of warrantless mass surveillance of who visits firearms-related locations. Travel-pattern data sufficient to identify visitors to those locations — without the statutory framework governing Form 4473 firearms transaction records — supports a Form 4473-by-movements analogy for counsel. Inject this analysis only when case facts indicate a firearms-related location. Stay in the legal register: lawful activity at a firearms-related location, Bruen, Form 4473, H.R. 9800 — not political campaign framing.",
      "Washington State SB 6002, effective March 30, 2026, places restrictions on how agencies can use ALPR technology, partly in response to a 2025 study revealing that U.S. Border Patrol accessed and searched ALPR databases in Washington localities for immigration enforcement purposes. SB 6002 is a working model for state ALPR restriction legislation. MRSC, 2026.",
      "The LAPD Inspector General audit finding a 32.3% false positive rate on hot-list alerts that triggered armed high-risk stops of innocent people — released July 10, 2026 — is official government evidence supporting Section 1983 damages claims for any plaintiff subjected to a Flock hot-list stop that was later determined to be a false positive. The Inspector General's own language — that such stops 'can affect individual liberty interests, erode public trust, and potentially create substantial legal and financial liability concerns' — is an official acknowledgment of Section 1983 exposure. Include the LAPD audit in the civil demand letter as evidence that the producing agency was or should have been on notice of Flock's false positive rate before the stop at issue.",
      "The IJ Database of ALPR Abuse documents extended wrongful imprisonment from Flock misidentification: Volusia County, FL (April 2026) — innocent driver jailed 13 days after officers mistook her car for one at a deadly accident scene; San Diego, CA (November 2025) — innocent driver jailed nearly one month after officers mistook his car for one at an attempted carjacking. Extended wrongful-imprisonment ALPR cases (13+ days) typically settle in the $100,000–$500,000+ range depending on employment impact, confinement conditions, and emotional distress. Auburn, WA (July 2026) — wrong-person arrest after Flock tracking of a shooting suspect. Cite IJ primary sources.",
      "The West Chester, OH evidence-tampering conviction (Michelle Berling, August 2024) establishes that civil plaintiffs can argue the Flock data ecosystem has been subject to criminal manipulation — relevant wherever the integrity of ALPR evidence used against the plaintiff is disputed.",
    ],
    droneFacts: [
      "Flock Safety is deploying drone surveillance programs beginning September 2026. The Lancaster, New York Police Department announced a three-month drone trial launching in September 2026, with drones responding to crimes, fires, and natural disasters (CNY News, August 5, 2026).",
      "Flock Safety's Alpha platform combines autonomous flight, aerial license plate recognition, thermal imaging, and live video with the company's existing police surveillance network (2026). Aerial ALPR plus thermal payloads intensifies Fourth Amendment curtilage concerns and, when flight paths cover firearms-related locations, the Bruen / Form 4473-by-movements analysis.",
      "Low-altitude drone surveillance over residential properties raises Fourth Amendment issues beyond fixed roadside cameras. Under Kyllo v. United States (2001), technology that reveals details of the home or its curtilage that would otherwise be private may require a warrant. A backyard is curtilage under Florida v. Jardines (2013).",
      "Under Carpenter v. United States (2018), persistent detailed observation of private activity over time is a search requiring a warrant regardless of whether observation occurs from technically public airspace.",
      "Under United States v. Jones (2012), the physical-intrusion trespass theory may apply to drones hovering at low altitude over curtilage — an area the Supreme Court treats as entitled to Fourth Amendment protection equivalent to the home itself.",
      "The same officers documented using fixed ALPR cameras for stalking and retaliatory surveillance will have access to drone platforms with richer sensor payloads. Documented personal and retaliatory misuse of fixed cameras applies with greater force to mobile aerial surveillance that can follow individuals and observe intimate spaces.",
    ],
    sources: [
      "haveibeenflocked.com — FOIA-derived audit logs",
      "Institute for Justice — IJ Database of ALPR Abuse, 146 documented incidents (published August 12, 2026): ij.org/the-ij-database-of-alpr-abuse",
      "Business Insider — Roseville CA 71% plate misread rate on felony/stolen alerts (July 2026)",
      "WCPO — West Chester OH Flock evidence tampering conviction (Michelle Berling, 2024)",
      "KUTV — Millcreek UT unauthorized Flock camera (August 2026)",
      "EFF — ALPR accuracy and misuse reporting",
      "Haaretz 2022 — Toka internal documents",
      "DHS SAVER ALPR Market Survey Report, June 2025",
      "404 Media — Flock stalking, travel-pattern pretext stops, ALPR non-disclosure SOPs, and traffic-enforcement misuse reporting (2024–2026)",
      "404 Media — 'Cops Used Flock to Track a Man Across State Lines…' (Abrams-Phillips / I-41), August 2026",
      "404 Media — 'DO NOT MENTION ALPR USAGE' (Wapello County, Iowa SOP), August 4, 2026",
      "404 Media — 'Police Used Flock to Give a Man a Traffic Ticket' (Georgia State Patrol), August 2026",
      "WTOC — Savannah SPD unjustified ALPR searches (August 2026)",
      "Union-Bulletin — Mooresville NC Flock investigation (August 2026)",
      "CNY News — Lancaster NY Flock drone program (August 2026)",
      "KCUR — Lenexa, Kansas retaliatory ALPR tracking / MYOC (February–June 2026) — vendor-agnostic pattern",
      "TMJ4 — Eagle Sports Range Flock camera removal (August 2026)",
      "FOX6 — Wisconsin Flock pushback and Milwaukee officer convictions (2026)",
      "Wisconsin Watch — Dane County contract termination (May 2026)",
      "WPR — Wisconsin communities end Flock contracts (June 2026)",
      "In re Four Applications… a/k/a Tower-Dump Warrants, No. 3:25-cr-00038 (S.D. Miss. Aug. 5, 2026) (Reeves, C.J.) — CourtListener ECF 41",
      "United States v. Smith, 110 F.4th 817 (5th Cir. 2024) — geofence warrants",
      "Carpenter v. United States, 585 U.S. 296 (2018)",
      "NYSRPA v. Bruen, 597 U.S. 1 (2022)",
      "H.R. 9800 — Protection Against Mass Surveillance Act (Rep. Tim Burchett, July 21, 2026)",
      "MRSC — Washington SB 6002 ALPR restrictions effective March 30, 2026",
      "ACLU Fourth Circuit amicus brief on ALPR (April 2026)",
      "404 Media / Benn Jordan — Condor camera open internet exposure (December 2025)",
      "9News — Douglas County Flock camera compromised (December 2025)",
      "404 Media — Benn Jordan podcast on discovery methodology (January 2026)",
      "404 Media — Flock ALPR camera vulnerabilities with physical access (November 2025)",
      "Gibbs Mura v. Flock Safety — San Francisco Superior Court class action (February 2026)",
      "Senator Ron Wyden — FTC investigation letter (December 2025)",
      "LAPD Office of the Inspector General — Flock hot-list audit, July 10, 2026 (32.3% false positive rate)",
      "Futurism — LAPD contract non-renewal reporting (July 2026)",
      "404 Media — LAPD Flock audit reporting (July 2026)",
      "The Drive / Joel Feder — Minnesota high-risk stop from Flock false alert (2026)",
      "Schmidt v. City of Norfolk — Fourth Circuit (pending); ACLU/EFF amicus",
      "ACLU — ALPR abuse documentation",
    ],
  },

  axon: {
    name: "Axon (formerly TASER)",
    errorRateFacts: [
      "Axon body-worn and fleet cameras are widely treated as the authoritative record of police encounters, yet departments using Axon still show systemic activation failures — e.g. Chicago COPA sustained BWC non-compliance in 68 of 186 reviewed allegations (2021 report).",
      "Vendor AI assist features (transcription, redaction, search) introduce secondary model-error risk when the state relies on AI-derived descriptions of what body-worn video shows.",
      "Body-worn reliability challenges are primarily completeness and chain-of-custody, not ALPR OCR — mute/off gaps are themselves the reliability defect.",
    ],
    accessAbuseFacts: [
      "NACDL materials emphasize that Evidence.com maintains evidence audit trails and device audit trails that defense counsel should demand with every footage production — yet those logs remain inside Axon's cloud.",
      "In NYPD § 1983 litigation, the City documented that bulk Evidence.com audit-trail downloads required also downloading every video and that Axon had not resolved technical errors blocking production (S.D.N.Y. letters, Feb. 2022).",
      "A Scottsdale audit of an Axon/Evidence.com deployment found former employees still had access (including admin rights) and videos deleted without required documentation.",
      "Retention and category-based deletion policies can destroy Brady material if preservation holds are late or incomplete.",
      "In Lenexa, Kansas, police used the city’s ALPR network (Axon, Genetec, and Leonardo — not Flock) to track private citizen Canyen Ashworth’s vehicle approximately 150 times over less than two years after he published a September 30, 2025 Kansas City Star guest column criticizing the Lenexa Police Department. On October 21, 2025, a department-wide BOLO identified him as a suspect in an unrelated “Paper Hanger” poster case, included a photo of his plate, and directed officers to “MYOC” (“make your own case”) — find pretextual reasons to stop him. He was never charged; police later determined he was not the person in the surveillance video. First Amendment experts and the ACLU of Kansas described the timing and tactics as retaliatory (KCUR, February 2, 2026; June 29, 2026).",
    ],
    authFacts: [
      "Axon Evidence does not publicly document cryptographic hashing of footage within camera hardware before dock / network upload, or external immutable anchoring independent of Axon infrastructure (Challenge-grade / clawql-surveillance class).",
      "Docking and cloud ingest commonly re-wrap or transcode media — integrity breakpoints unless a pre-upload hash was computed on-device.",
      "Mute, buffer, and activation events are central to authenticity; Colorado and Illinois statutes attach evidentiary consequences when officers fail to record (People v. Havens; People v. Tompkins).",
      "Cloud storage on third-party infrastructure (e.g. Microsoft Azure) means chain of custody depends on Axon's internal controls rather than independent verification.",
    ],
    civilFacts: [
      "Section 1983 provides a federal cause of action where body-worn video is incomplete, missing, or selectively retained in force or detention cases.",
      "Billings, Montana reporting on officers removing/turning off BWCs during a 2023 stop — later prompting review of nearly 180 cases — shows how camera-off conduct becomes both criminal-discovery and civil-exposure fuel.",
      "Wrongful arrest settlements involving short detention without physical injury typically range from $10,000 to $75,000; prolonged detention or physical injury frequently reach $100,000 to $500,000 or more.",
      "The Lenexa “MYOC” BOLO is documented evidence of First Amendment retaliatory surveillance and pretextual-stop initiation via ALPR. Under Nieves v. Bartlett (2019), where no probable cause exists — Ashworth was not the poster hanger — retaliatory motive is not defeated by a technical legal justification. A § 1983 First Amendment retaliation claim is viable independent of Fourth Amendment arguments. Discovery should seek: ALPR queries against the plaintiff’s plate in the 90 days after public criticism; the complete BOLO; communications directing officers to find stop pretexts; BOLO issuance policy and required suspicion standard; and prior civil-rights complaints involving the same supervisors.",
    ],
    sources: [
      "Axon Evidence platform documentation (public)",
      "NACDL Champion — Harlan Yu on Evidence.com audit trails (2019)",
      "S.D.N.Y. City letters on Evidence.com audit-trail production (Feb. 2022)",
      "Scottsdale Evidence.com access/deletion audit reporting",
      "Chicago COPA BWC non-compliance report (2021); CBS 2 'Left in the Dark'",
      "People v. Havens, 2025 CO 72; People v. Tompkins, 2023 IL 127805",
      "MTN News / KPAX — Billings BWC 'hidden consent' reporting",
      "KCUR — Lenexa, Kansas retaliatory ALPR tracking / MYOC (February 2, 2026; June 29, 2026)",
      "The Pitch KC — EyesOffKC organizing (August 2026)",
      "ACLU of Kansas — Lenexa retaliatory surveillance commentary",
      "Challenge the Footage — Challenge-grade / clawql-surveillance integrity bar",
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
      "The officer abuse pattern documented across ALPR systems — see the Institute for Justice Database of ALPR Abuse (146 source-cited incidents, Aug. 12, 2026) — is a systemic failure of access controls that applies to any vendor without meaningful query auditing.",
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
      "In Lenexa, Kansas, police used an ALPR system that includes Genetec technology (alongside Axon and Leonardo) to track private citizen Canyen Ashworth’s vehicle approximately 150 times over less than two years after he published a Kansas City Star guest column criticizing the Lenexa Police Department. Officers issued a department-wide BOLO directing officers to “MYOC” — make your own case — find pretextual reasons to stop him. He was never charged. The ACLU of Kansas described the tactics as retaliatory (KCUR, February 2, 2026; June 29, 2026).",
    ],
    authFacts: [
      "Genetec does not publicly document cryptographic hashing of footage within camera hardware, Merkle-chained audit logs, or external immutable anchoring.",
      "Independent verification of footage integrity requires Genetec cooperation — there is no external anchor allowing third-party verification.",
    ],
    civilFacts: [
      "Section 1983 provides a federal cause of action for Fourth Amendment violations arising from wrongful stops based on ALPR misidentification.",
      "The Lenexa “MYOC” directive constitutes documented evidence of First Amendment retaliatory surveillance. Where officers direct pretextual stops against a person who exercised First Amendment rights and no probable cause exists, a § 1983 First Amendment retaliation claim is viable independent of Fourth Amendment arguments (Nieves v. Bartlett, 2019). Discovery should target post-criticism plate queries, the complete BOLO, pretext-stop directives, and BOLO policy.",
    ],
    sources: [
      "Genetec Security Center documentation (public)",
      "Institute for Justice — ALPR error documentation",
      "DHS SAVER ALPR Market Survey Report, June 2025",
      "KCUR — Lenexa, Kansas retaliatory ALPR tracking / MYOC (February 2, 2026; June 29, 2026)",
      "ACLU of Kansas — Lenexa retaliatory surveillance commentary",
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

function buildSystemPrompt(vendorKey, customDetails, footageCategory = "fixed_surveillance") {
  const resolved = resolveFootageProfile(
    footageCategory,
    vendorKey,
    VENDORS[vendorKey] || null,
    customDetails?.name
  );
  const profile = resolved.profile;
  const vendorName = resolved.vendorName;
  const mode = resolved.mode;
  const pack = resolved.pack;

  const profileSection = profile
    ? `
## Footage category: ${mode.label}
${mode.description}

## Pressure line
${pack.pressureLine}

## Documented facts: ${vendorName}

### Authentication and integrity gaps
${profile.authFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

### Reliability / accuracy frame (${pack.accuracyFrame})
${profile.errorRateFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

### Access / custody frame (${pack.accessFrame})
${profile.accessAbuseFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

### Civil liability and litigation context
${profile.civilFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}
${
  profile.droneFacts?.length
    ? `
### Drone-specific documented facts
${profile.droneFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}
`
    : ""
}
### Sources
${profile.sources.map((s) => `- ${s}`).join("\n")}
${
  customDetails?.additionalVendorFacts
    ? `\n### Operator-supplied source facts\n${customDetails.additionalVendorFacts}\n`
    : ""
}
`
    : customDetails?.additionalVendorFacts
      ? `
## Footage category: ${mode.label}
${pack.pressureLine}

## User-provided facts about ${vendorName}
${customDetails.additionalVendorFacts}
`
      : `
## Footage category: ${mode.label}
## Source: ${vendorName}
${pack.pressureLine}
No pre-populated profile available. Apply the four vectors using mode-appropriate discovery (integrity, reliability, access/custody, civil). Seek hash-at-capture, mute/dock or device-extraction logs, and independent verification — not vendor-portal assertions.
`;

  const vectorBlock =
    footageCategory === "body_worn"
      ? `## The four attack vectors (body-worn / in-car)

### Vector 1 — Authentication (FRE 901)
Body-worn footage must be authenticated under FRE 901(b)(9). Demand hash before leave-device, tamper-evident activation/mute/dock logs, and external integrity anchoring. Evidence.com-class clouds as sole oracle are vendor assertion, not proof. Push vendors toward Challenge-grade / clawql-surveillance-class controls or exclusion.

### Vector 2 — Reliability (FRE 702 / Daubert)
Focus on completeness and fidelity — not ALPR OCR. Non-activation, mute gaps, dock re-encode, and AI transcript/redaction errors are reliability defects. Partial clips presented as the whole encounter fail Daubert gatekeeping.

### Vector 3 — Access / Brady / Fourth Amendment
Who viewed/exported vault files, retention/auto-delete, and withheld multi-officer angles are the body-cam analogues of ALPR query abuse. Incomplete production is a constitutional issue when force or detention is at stake.

### Vector 4 — Civil damages (Section 1983)
Missing or selectively retained body-worn video that conceals force supports § 1983 exposure. Damages frameworks match other unlawful-force / wrongful-detention cases.`
      : footageCategory === "cellphone"
        ? `## The four attack vectors (cell phone / personal device)

### Vector 1 — Authentication (FRE 901)
Phone video must be authenticated. Without capture-time hash / content credentials / Challenge-grade package, AI alteration and silent re-encode cannot be ruled out. WhatsApp/iCloud/share-sheet exports destroy provenance. "Just watch the video" is not FRE 901(b)(9).

### Vector 2 — Reliability (FRE 702 / Daubert)
Deepfakes, consumer editors, selective clipping, and juror over-trust of video. Require cryptographic proof or exclude / limit. Challenge-grade civilian capture sets the floor accusatory phone video should meet.

### Vector 3 — Riley / extraction / selective production
Riley v. California constrains phone searches. Overbroad extraction and withholding neighbor clips are suppressible / Brady problems. Officer personal-phone recording outside BWC policy needs discovery.

### Vector 4 — Civil damages (Section 1983)
Reliance on unverified or altered phone video to justify force or charges supports constitutional and tort theories.`
        : `## The four attack vectors (fixed / ALPR surveillance)

### Vector 1 — Authentication (FRE 901)
Surveillance footage offered as evidence must be authenticated under FRE 901. FRE 901(b)(9) requires the proponent to show the system producing the evidence is reliable and produces accurate results. No major surveillance vendor publicly documents: (1) cryptographic hashing of footage within camera hardware before network transmission, (2) Merkle-chained audit logs, (3) external immutable anchoring of Merkle roots to a system outside the vendor's control, or (4) tamper-evident access logs for all queries. Without these controls, "this is what the camera recorded, unaltered" is a vendor assertion — not a provable fact. The capability to alter footage without forensic traces is commercially available (Toka, documented by Haaretz 2022).

For Flock Safety Condor PTZ cameras specifically, the FRE 901 authentication argument has additional documented factual support beyond the general absence of cryptographic chain of custody controls. In December 2025, it was publicly reported and independently confirmed that at least 60 Condor cameras were left streaming live to the open internet with no authentication required — accessible via search engine query. Anyone could watch live feeds, download 30 days of archived footage, change settings, view logs, and delete recordings. Flock did not disclose when the misconfiguration began. For any Condor camera footage offered as evidence, the authentication argument is: during an unknown exposure window predating December 2025, the footage was demonstrably accessible to unknown third parties with full administrative access including deletion and modification rights. Authentication under FRE 901(b)(9) cannot be established when the producing party cannot demonstrate the footage was not accessed or modified during this exposure window. Include this documented security failure in the discovery requests: demand the complete log of all external IP addresses that accessed the specific camera during the 30-day retention window preceding the incident at issue, and Flock's disclosure of when the misconfiguration on that specific camera began and was remediated. When the camera type is Condor / PTZ or otherwise unknown, include Condor exposure arguments in the alternative and demand production of the camera model.

### Vector 2 — Accuracy (FRE 702 / Daubert)
AI-generated evidence is subject to reliability scrutiny under FRE 702 and Daubert. ALPR systems operate at a documented error rate that varies by measurement type. On plate character reads, the industry estimate is approximately 10% misread rate (2019, confirmed by DHS June 2025 market survey). On actionable hot-list alerts that result in traffic stops — the most legally significant output — the documented rate is substantially higher.

The LAPD Office of the Inspector General audit released July 10, 2026, found a 32.3% false positive rate on Flock hot-list alerts during a two-month review period: 161 of 498 alerts that triggered traffic stops were false positives. Every false alert resulted in a high-risk stop protocol against an innocent driver. The Inspector General described the stop protocol: officers call for backup, air support, and a supervisor, and order the driver out of the vehicle. The false positives were caused not by camera misreads but by stale database records — stolen vehicles never cleared from hotlists. This is critical for the Daubert argument: the relevant unit for reliability analysis is the system as a whole — cameras plus database plus alert mechanism — which produced a 32.3% false positive rate on enforcement actions. LAPD allowed its three-year contract to expire in July 2026 rather than renew it.

At a 32.3% false positive rate on enforcement actions, officers had a 1-in-3 chance of conducting an armed high-risk stop on an innocent person in response to a Flock alert. No court has established an acceptable false positive rate for AI-generated alerts used to initiate armed stops, detentions, and arrests. Under FRE 702 and Daubert, the proponent must demonstrate the system produces reliable results. A system generating armed stops of innocent people one in three times, documented by an official government Inspector General audit, does not meet that standard.

The LAPD OIG audit is official government evidence — not an advocacy estimate — and should be cited by name and date in every FRE 702 motion involving Flock hot-list alerts. The appropriate floor for evidence used in criminal prosecution remains no worse than 1 error per 1,000 reads (0.1%), independently verified — a standard no major vendor has publicly demonstrated.

The Roseville, California deployment provides additional documented accuracy data: Flock sent 1,427 alerts to Roseville police over two years flagging cars as stolen or used in a felony. In 71% of those alerts, the cameras read the plates incorrectly. This is a plate misread rate, not a false positive rate on actionable alerts — it measures the upstream accuracy of the system before database matching. Source: Business Insider, citing a documented department audit, July 2026; IJ Database of ALPR Abuse.

The IJ Database of ALPR Abuse documents multiple incidents where specific character confusion errors — O/0, 7/2, H/M — caused armed high-risk stops of innocent people:
- Toledo, OH (April 2024): "7" misread as "2" — driver detained at gunpoint, dog attack, hours in jail
- Morristown, TN (June 2024): "O" misread as "0" — two grandparents detained at gunpoint with three-year-old granddaughter in car
- Sherwood, AR (February 2026): one letter misread — innocent couple ordered out of car at gunpoint
- Espanola, NM (July 2023): digit misread — two innocent sisters detained at gunpoint

These are not statistical abstractions. They are documented outcomes of the same character confusion errors the DHS June 2025 market survey acknowledged without setting any minimum standard. Cite the IJ database (ij.org/the-ij-database-of-alpr-abuse) and primary sources.

### Vector 3 — Access abuse and Fourth Amendment
ALPR data used to initiate a stop or investigation is a search. Argue on three prongs when facts fit: (1) unauthorized / undocumented access; (2) concealment and pretext (404 Media August 2026 series); (3) the ALPR dragnet itself as a warrantless general search under the Carpenter → Smith → Reeves tower-dump line. Discovery into officer query history and warrant authorization is essential.

The Institute for Justice maintains a publicly available, source-cited database of ALPR abuse incidents at ij.org/the-ij-database-of-alpr-abuse, published August 12, 2026, containing 146 documented incidents categorized as: stalking (officers tracking romantic partners, family members, and romantic rivals), errors (misread plates and misinterpreted alerts resulting in wrongful stops and detentions), non-law-enforcement use (personal searches unrelated to any investigation), and other misuse (unauthorized data sharing, evidence tampering, and policy violations). Every incident is linked to a primary source. This is the most comprehensive publicly available documentation of ALPR abuse. The database is actively maintained and updated. Cite it in place of outdated "28+" stalking counts. FOIA-derived Flock logs separately show ~84% of searches without case numbers. Flock announced mandatory case codes and Audit Assistance on August 13, 2026 — the day after the IJ database publication — which counsel may frame as a response to documented systematic failure.

Among the documented incidents directly relevant to authentication and evidence integrity arguments:

In West Chester, Ohio (August 2024), former officer Michelle Berling was sentenced to five years of probation after being convicted of tampering with Flock data and images — the only documented criminal conviction for evidence tampering using the Flock system itself.

In Millcreek, Utah (August 2026), authorities discovered a Flock camera on city property and removed it after being unable to determine who installed it or who had access to it — a documented case of an unaccountable camera with unknown access chain.

Additional Fourth Amendment vectors (include when facts fit):
- **General warrant / tower-dump analogy (structural):** Tower dumps that collect everyone's location data near a scene for later sifting are per se unconstitutional general warrants — In re Four Applications… a/k/a Tower-Dump Warrants, No. 3:25-cr-00038 (S.D. Miss. Aug. 5, 2026) (Reeves, C.J.), following United States v. Smith, 110 F.4th 817 (5th Cir. 2024) on geofence warrants. ALPR networks passively capture every vehicle and allow retroactive multi-camera sifting to identify suspects — collect the haystack, find the needle later. Argue that warrantless ALPR queries used to build travel-pattern suspect profiles require particularized probable cause under Carpenter v. United States, 585 U.S. 296 (2018), regardless of the officer's subjective purpose. Post-collection filtering does not cure the initial overbreadth. Schmidt v. City of Norfolk is pending before the Fourth Circuit with ACLU and EFF amicus briefs arguing that ALPR networks violate Fourth Amendment privacy expectations. A Virginia Circuit Court previously found Flock ALPR data collection requires a warrant; the Virginia Court of Appeals reversed that decision in October 2025. The Fourth Circuit will be among the first federal circuit courts to directly address the ALPR warrant / mass-location-surveillance question. Defense attorneys in the Fourth Circuit (Virginia, Maryland, North Carolina, South Carolina, West Virginia) should cite Schmidt as pending authority and argue that the constitutional question has not been settled in Flock's favor.
- **Pretext stop via travel-pattern analysis:** Mass ALPR networks used to reconstruct interstate travel (e.g. Wisconsin↔Michigan marijuana corridor / Abrams-Phillips) and retrofit that pattern into probable cause. Whren v. United States permits many pretextual stops, but using a dragnet surveillance network to build a behavioral profile of travel to an activity legal in another state is contestable — and is the fact pattern that maps most cleanly onto the tower-dump / geofence line.
- **Concealment / bad faith / Franks:** Written policies instructing officers not to mention ALPR usage to occupants, in reports, or in complaints (Wapello County, Iowa SOP Nov. 2025), plus FBI/DOJ guidance to be "as vague as permissible" about Flock use because searches are public-records-discoverable, are evidence of systemic concealment. Omitting material ALPR reliance from a probable cause affidavit at the direction of policy can support a Franks v. Delaware challenge.
- **Mission creep / traffic enforcement:** Flock pitched for serious crime / stolen vehicles / missing persons but used for minor traffic citations despite public "not for traffic enforcement" claims — undermines stated purpose limitations and supports overbreadth / pretext arguments.
- **Private-operator contract control / state-actor theory:** Where a private business (rather than a government agency) operated the Flock cameras that captured the plate at issue, add an argument that the private operator's contractual relationship with Flock — including Flock's documented practice of forcing continued data collection against the customer's wishes (Eagle Sports Range, Cudahy, Wisconsin, 2026) — may make Flock a state actor for Fourth Amendment purposes when the data is shared with or queried by law enforcement. The San Jose plaintiffs argue this "deeply integrated" private surveillance theory. The Eagle Sports Range contract dispute is documented evidence that Flock maintains independent control over camera operation regardless of what the nominal operator wants, supporting the argument that Flock — not the private business — is the operative data collector.

### Vector 4 — Civil damages (Section 1983)
Wrongful stops and detentions based on ALPR misidentification are actionable under § 1983. Settlement ranges commonly $10,000–$75,000 for brief detentions to $100,000–$500,000+ for prolonged harm. When the stop was based on a Flock hot-list alert later shown to be a false positive, cite the LAPD Office of the Inspector General audit (July 10, 2026) — 32.3% false positive rate on actionable hot-list alerts; Inspector General acknowledgment of liberty, trust, and "substantial legal and financial liability concerns" — as official government notice that agencies deploying Flock hot-list enforcement were or should have been aware of systemic false-positive risk.

The IJ Database of ALPR Abuse documents several cases where ALPR errors resulted in extended wrongful imprisonment:
- Volusia County, FL (April 2026): innocent driver jailed for 13 days based on Flock misidentification linking her car to a deadly accident scene
- San Diego, CA (November 2025): innocent driver jailed for nearly one month based on Flock misidentification linking his car to an attempted carjacking

These cases represent the upper end of compensable damages for ALPR-caused wrongful imprisonment. Extended wrongful imprisonment cases — 13 days or longer — typically settle in the $100,000 to $500,000 range or higher depending on employment impact, physical conditions of confinement, and emotional distress.

The West Chester, OH evidence tampering conviction (August 2024) establishes that civil plaintiffs can argue the Flock data ecosystem has been subject to criminal manipulation — relevant to any civil claim where the integrity of the ALPR evidence used against the plaintiff is disputed. Cite ij.org/the-ij-database-of-alpr-abuse and primary sources.

Where the user's plate was captured at a gun range, gun store, gun show, or firearms training facility, include a Second Amendment legal-standard argument alongside the Fourth Amendment claim — only when case facts indicate a firearms-related location. Do not frame this as a political gun-rights position; use "lawful activity at a firearms-related location," Bruen, Form 4473, and H.R. 9800.

Under NYSRPA v. Bruen, 597 U.S. 1 (2022), the government bears the burden of demonstrating that any regulation of the right to keep and bear arms is consistent with the historical tradition of firearm regulation. There is no historical tradition of warrantless mass surveillance of who visits firearms-related locations. ALPR collection at these locations can create a Form 4473-by-movements list — identification of likely visitors by travel pattern rather than by federally regulated firearms transaction records — with none of Form 4473's statutory framework, oversight, or limitations. When quoting public characterizations of this pattern (e.g., Chris McNutt's Form 4473 analogy), attribute the source; do not adopt campaign slogans as the tool's voice.

The argument applies with particular force when: (a) the user's plate was captured repeatedly at firearms-related locations; (b) the data was shared with or queried by federal agencies including ATF; or (c) the capture occurred at a private business that did not consent to continued data collection (Eagle Sports Range, Cudahy, Wisconsin, August 2026 — contractual forced continued collection).

Discovery: all ALPR queries against plates captured at the specific firearms-related location; sharing with ATF, DHS, and FBI; any elevated-risk categorization of frequent visitors; and the private operator's contract terms. Reference H.R. 9800 (Protection Against Mass Surveillance Act, Rep. Tim Burchett, referred to House Oversight as of August 2026) as a legislative fact acknowledging federal concern.

### Vector 5 — First Amendment retaliation via ALPR surveillance
ALPR systems have been documented as instruments of First Amendment retaliation. In Lenexa, Kansas, police used a non-Flock ALPR network (Axon, Genetec, Leonardo) to track Canyen Ashworth’s vehicle ~150 times over less than two years after he published a newspaper column criticizing the department, then issued a department-wide BOLO directing officers to “MYOC” — make your own case — find pretextual reasons to stop him. He was never charged and was not the person in the poster-hanger video (KCUR, Feb.–June 2026).

Where a person was tracked via ALPR after exercising First Amendment rights (publishing criticism of police, attending a protest, distributing political material), and where ALPR data was used to engineer pretextual stops, a § 1983 First Amendment retaliation claim is viable independent of Fourth Amendment arguments. Under Nieves v. Bartlett (2019), where no probable cause exists, retaliatory motive is not defeated by a technical legal justification. Written “MYOC”-style directives are rare direct evidence of retaliatory motive.

Discovery for First Amendment retaliation fact patterns: all ALPR queries against the plaintiff’s plate in the 90 days following any public criticism of the department; the complete BOLO or alert identifying the plaintiff; any written or electronic communications directing officers to find pretextual reasons to stop the plaintiff; department policy on when BOLOs may be issued and the required suspicion standard; any prior civil-rights complaints involving the same supervisors.

When generating the civil damages document, determine from the user’s case facts whether Vector 5 applies — if the user was tracked after public criticism of police, political activity, or protest attendance, include the First Amendment retaliation claim as a parallel theory alongside the Fourth Amendment claim.

### Vector 6 — Drone surveillance (Fourth Amendment — curtilage and Kyllo)
Where the vendor has droneFacts or the case involves drone surveillance, incorporate these arguments into the suppression motion and civil demand. Low-altitude drone surveillance over residential properties raises Fourth Amendment issues beyond fixed roadside cameras.

Under Kyllo v. United States (2001), technology that reveals details of the home or its curtilage that would otherwise be private requires a warrant. A backyard is curtilage under Florida v. Jardines (2013). Under Carpenter v. United States (2018), persistent detailed aerial observation of private residential activity over time is a search requiring a warrant. Under United States v. Jones (2012), the physical-intrusion trespass theory may apply to low-altitude drones hovering over curtilage. The manned-aircraft cases — Florida v. Riley (1989), Dow Chemical Co. v. United States (1986) — addressed navigable airspace altitudes and are not controlling for drones operating at low altitude with high-resolution sensors.

No circuit has directly settled low-altitude residential drone surveillance; preserve the Kyllo / Carpenter / Jones foundation for appellate review.`;

  return `You are a legal and technical expert helping people challenge digital camera evidence — fixed/ALPR surveillance, police body-worn cameras, and cell phone video — and seek civil remedies. You generate four types of documents (FRE 901, FRE 702, Fourth Amendment suppression, § 1983 demand). For fixed/ALPR cases, Vectors 5 (First Amendment retaliation) and 6 (drone / curtilage) enrich the civil and suppression documents when facts fit — they are not separate tabs.
${vectorBlock}
${profileSection}
## Document generation standards

Every document must be precise, authoritative, and immediately usable as an attorney-review starting point. Lead with the strongest factual claims. Cite sources. No throat-clearing. Number argument paragraphs. Write as if a senior civil rights attorney will review and file this. Emphasize that First Amendment retaliatory ALPR surveillance is vendor-agnostic — Lenexa used Axon/Genetec/Leonardo, not Flock.`;
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
        const readiness = gatewayReadiness(env);
        return json({
          ok: true,
          service: "challenge-the-footage",
          time: new Date().toISOString(),
          generationMode: wantsOfflineGeneration(env) ? "offline" : "gateway",
          testAuthEnabled: env.ALLOW_TEST_AUTH === "true",
          gatewayReadiness: readiness,
        });
      }
      if (url.pathname === "/api/extract-case" && request.method === "POST") {
        return handleExtractCase(request);
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
      if (url.pathname === "/api/evidence/sync-lite" && request.method === "POST") {
        return handleEvidenceSyncLite(request, env);
      }
      if (url.pathname === "/api/evidence/safety-ping" && request.method === "POST") {
        return handleEvidenceSafetyPing(request, env);
      }
      if (url.pathname === "/api/evidence/incident/create" && request.method === "POST") {
        return handleIncidentCreate(request, env);
      }
      if (url.pathname === "/api/evidence/incident/join" && request.method === "POST") {
        return handleIncidentJoin(request, env);
      }
      if (url.pathname === "/api/evidence/incident/heartbeat" && request.method === "POST") {
        return handleIncidentHeartbeat(request, env);
      }
      if (url.pathname === "/api/evidence/incident/signal" && request.method === "POST") {
        return handleIncidentSignal(request, env);
      }
      if (url.pathname.startsWith("/api/evidence/incident/") && request.method === "GET") {
        const id = url.pathname.split("/api/evidence/incident/")[1];
        if (id && !["create", "join", "heartbeat", "signal"].includes(id)) {
          return handleIncidentGet(request, env, id);
        }
      }
      if (url.pathname === "/api/evidence/claim" && request.method === "POST") {
        return handleEvidenceClaim(request, env);
      }
      if (url.pathname === "/api/evidence/upload-url" && request.method === "POST") {
        return handleEvidenceUploadUrl(request, env);
      }
      if (url.pathname.startsWith("/api/evidence/object/") && request.method === "PUT") {
        const parts = url.pathname.split("/api/evidence/object/")[1].split("/");
        return handleEvidenceObjectPut(request, env, parts[0], parts[1]);
      }
      if (url.pathname === "/api/evidence/sessions" && request.method === "GET") {
        return handleEvidenceSessions(request, env);
      }
      if (url.pathname.startsWith("/api/evidence/verify/") && request.method === "GET") {
        return handleEvidenceVerify(request, env, url.pathname.split("/api/evidence/verify/")[1]);
      }
      // Prefer clean URLs in the address bar (/media not /media.html).
      if ((request.method === "GET" || request.method === "HEAD") && !wantsMarkdown(request)) {
        const clean = htmlExtensionRedirect(url.pathname);
        if (clean !== null) {
          const dest = new URL(request.url);
          dest.pathname = clean;
          return new Response(null, {
            status: 301,
            headers: {
              Location: dest.toString(),
              "Cache-Control": "public, max-age=0, must-revalidate",
              "CDN-Cache-Control": "no-store",
            },
          });
        }
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

function gatewayReadiness(env) {
  const missing = [];
  if (!env.CLAWQL_GATEWAY_URL) missing.push("CLAWQL_GATEWAY_URL");
  if (!env.CLAWQL_API_KEY) missing.push("CLAWQL_API_KEY");
  if (!env.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
  const forced =
    env.GENERATION_MODE === "offline"
      ? "offline"
      : env.GENERATION_MODE === "gateway"
        ? "gateway"
        : null;
  return {
    configured: missing.filter((k) => k.startsWith("CLAWQL")).length === 0 && forced !== "offline",
    missing,
    googleSignIn: !!env.GOOGLE_CLIENT_ID,
    generationModeForced: forced,
  };
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

function gatewayPrompts(vendorName, ctx, base) {
  const cat = ctx.footageCategory || "fixed_surveillance";
  if (cat === "body_worn") {
    const rec = ctx.bodyCamRecordingStatus || "recorded";
    const ratchet = bodyCamRatchetLine(rec);
    if (rec === "missing") {
      return {
        motion: `Draft a TWO-STAGE body-worn motion: Stage 1 failure-to-record / adverse inference, Stage 2 FRE 901 authenticity ratchet for any later-produced footage.
${base}
Recording status: NO usable ${vendorName} recording was produced (never activated / camera off).
Operator facts: ${ctx.searchFacts || "discovery will establish duty to activate and device audit trail"}
Ratchet: ${ratchet}
Requirements:
1. Caption 2. Intro seeking (a) adverse inference / statutory presumption for missing BWC (cite Colo. § 24-31-902 / People v. Havens; Ill. 50 ILCS 706 / People v. Tompkins where helpful), (b) limit officer testimony filling the gap, (c) FRE 901 hearing for any clip still offered
3. Facts: duty to record under policy/statute; no file produced; camera assignment
4. Stage 1 legal standard — duty to record + inferences/presumptions + due process
5. Stage 2 — any existing/other-officer ${vendorName} media still needs hash-before-leave-device and independent verification (clawql-surveillance-class)
6. Ten discovery requests focused on device audit trail, activation duty, other officers' cameras
7. Prayer 8. Signature
Write the complete motion. Number paragraphs.`,
        accuracy: `Draft FRE 702 motion: a body-worn "system" that fails to record required encounters is unreliable.
${base}
Recording status: missing. Ratchet: ${ratchet}
Requirements: duty-to-record as reliability; Chicago COPA / CBS Left in the Dark style systemic non-activation; proposed Challenge-grade auditability minimum; ten discovery requests; prayer; signature.`,
        access: `Draft Brady/spoliation motion to compel device audit trails and sanctions for missing required ${vendorName} body-worn footage.
${base}
Additional facts: ${ctx.searchFacts || "not specified"}
Ratchet: ${ratchet}
Requirements: spoliation/Brady when required recording absent; compel Evidence.com device audit trail; Billings-style camera-off examples; ten discovery requests; prayer; signature.`,
      };
    }
    return {
      motion: `Draft a motion in limine to exclude ${vendorName} body-worn / in-car footage on authentication grounds under FRE 901, preserving Stage 1 failure-to-record remedies if activation logs show gaps${rec === "partial" ? " (PARTIAL/MUTE GAPS are the primary Stage 1 issue)" : ""}.
${base}
Recording status: ${rec}. Ratchet: ${ratchet}
Requirements:
1. Caption block with full case details
2. Introduction stating relief sought (exclude body-worn footage lacking Challenge-grade integrity; adverse inference for mute/off intervals)
3. Factual background: device/vendor, docking/cloud path, how prosecution will use the video; note any mute/late-activation gaps
4. FRE 901(a) and 901(b)(9) standard — process/system reliability
5. Argue absence of: (a) cryptographic hash before leave-device, (b) tamper-evident activation/mute/dock logs, (c) Merkle or equivalent audit chain, (d) external immutable anchor independent of the evidence cloud
6. Explain why Evidence.com-class portals as sole oracle are vendor assertion; demand clawql-surveillance-class controls
7. Ten discovery requests on body-worn integrity (hash, mute/dock, export, re-encode)
8. Prayer: exclusion or evidentiary hearing with live independent verification
9. Signature placeholder
Write the complete motion. Number paragraphs.`,
      accuracy: `Draft a FRE 702 / Daubert motion challenging reliability of ${vendorName} body-worn footage and any AI assist output (transcript/redaction/search).
${base}
Recording status: ${rec}. Ratchet: ${ratchet}
Requirements:
1. Caption 2. Intro independent of authentication motion
3. FRE 702 / Daubert gatekeeping for completeness and AI-derived descriptions
4. Completeness problem: non-activation, mute gaps, buffer limits, dock/cloud re-encode, partial multi-officer sets
5. Proposed minimum: hash-before-leave-device + tamper-evident activation/mute logs + complete officer set
6. Argue AI assist misdescription risk
7. Ten discovery requests on completeness testing and AI tools
8. Prayer for exclusion or hearing
9. Signature placeholder
Write the complete motion.`,
      access: `Draft a motion to suppress / compel complete ${vendorName} body-worn evidence on Fourth Amendment and Brady grounds.
${base}
Additional facts: ${ctx.searchFacts || "not specified — include discovery to establish activation, mute, exports, multi-officer angles"}
Recording status: ${rec}. Ratchet: ${ratchet}
Requirements:
1. Caption 2. Intro 3. Legal standard (exclusionary rule + Brady completeness)
4. Vault access/export/retention failures; failure-to-activate as constitutional issue in force cases
5. Ten discovery requests on vault logs, retention, redacted vs masters, personal-phone sidecars
6. Prayer for suppression or complete production with integrity proofs
7. Signature placeholder
Write the complete motion.`,
    };
  }
  if (cat === "cellphone") {
    return {
      motion: `Draft a motion in limine to exclude cell phone video for lack of authentication under FRE 901, emphasizing AI-alteration and provenance risk.
${base}
Requirements:
1. Caption 2. Intro — exclude unverified phone video
3. Facts: device, how obtained, export path (Messages/WhatsApp/cloud)
4. FRE 901(a)/(b)(9) — process reliability
5. Argue no capture-time hash/content credential/Challenge-grade package; re-encode destroys provenance; EXIF is spoofable
6. Generative AI alteration is widely available; "just watch the video" is insufficient
7. Ten discovery requests for original camera-roll file, hashes at each hop, AI/edit apps, cloud logs
8. Prayer: exclusion or hearing requiring cryptographic proof it was not AI-altered
9. Signature placeholder
Write the complete motion.`,
      accuracy: `Draft a FRE 702 / Daubert motion to exclude unverified / AI-risk cell phone video.
${base}
Requirements:
1. Caption 2. Intro 3. FRE 702 standard for technical video evidence
4. Deepfake/edit risk, selective clipping, juror over-trust of video (FRE 403 prejudice)
5. Proposed minimum: capture-time cryptographic proof or exclusion/limiting instruction
6. Note Challenge-grade civilian capture as the floor accusatory phone video should meet
7. Ten discovery requests on editing apps, splice analysis, neighbor files
8. Prayer 9. Signature
Write the complete motion.`,
      access: `Draft a motion to suppress cell phone video / limit extraction under Riley and selective-production/Brady principles.
${base}
Additional facts: ${ctx.searchFacts || "not specified — discovery for warrant theory, extraction scope, withheld clips"}
Requirements:
1. Caption 2. Intro 3. Riley v. California standard; overbroad extraction
4. Selective production of one clip when related media existed
5. Officer personal-phone recording outside BWC policy if applicable
6. Ten discovery requests (warrant, extraction scope, cloud warrants, hash chain of custody)
7. Prayer 8. Signature
Write the complete motion.`,
    };
  }
  return {
    motion: `Draft a motion in limine to exclude ${vendorName} surveillance footage on authentication grounds under FRE 901.
${base}
Requirements:
1. Caption block with full case details
2. Introduction stating the specific relief sought
3. Factual background: what ${vendorName} is, what footage is at issue, how prosecution intends to use it
4. Legal standard under FRE 901(a) and 901(b)(9) — process or system reliability
5. Argument establishing the system lacks: (a) cryptographic hash of footage computed within camera hardware at capture, (b) Merkle-chained audit logs, (c) external immutable anchoring of Merkle roots, (d) tamper-evident access logs for all queries regardless of case number
6. Section on commercial availability of undetectable footage alteration — reference Toka (Haaretz 2022) as the documented baseline risk applicable to any vendor whose footage cannot be independently authenticated
7. When ${vendorName} is Flock Safety (or Condor PTZ facts appear in VENDOR FACTS / case facts): dedicated section on the December 2025 Condor open-internet exposure — at least 60 AI Condor cameras streaming live and archived footage with no authentication; administrative access including deletion; unknown exposure start date; FRE 901(b)(9) failure for Condor footage during the undisclosed window. Cite Benn Jordan / GainSec / 404 Media / 9News; Wyden FTC letter; Gibbs Mura v. Flock Safety (S.F. Superior Ct., Feb. 2026). Argue that "limited misconfiguration… since been remedied" without a disclosed start date does not authenticate footage from the relevant period.
8. Specific discovery requests targeting ${vendorName}'s integrity controls (at least ten), and when Flock/Condor facts apply include: complete logs of all IP addresses and sessions that accessed the camera's administrative portal, live feed, or archived footage during the 30-day retention window preceding the incident; Flock's internal documentation of when the December 2025 open-internet misconfiguration began and when it was remediated for the specific camera; records of whether footage was accessed, downloaded, modified, or deleted by any party other than authorized agency personnel; camera model identification (Condor vs ALPR vs other)
9. Prayer for relief: exclusion, or in the alternative a Daubert-style hearing requiring ${vendorName} to demonstrate cryptographic integrity controls through live independent verification — and, for Condor footage, affirmative proof the camera was not exposed during the relevant retention window
10. Signature block placeholder
Write the complete motion. Number all argument paragraphs.`,
    accuracy: `Draft a motion challenging the reliability of ${vendorName} AI surveillance technology under FRE 702 and Daubert v. Merrell Dow Pharmaceuticals.
${base}
Requirements:
1. Caption block with full case details
2. Introduction: this motion challenges admissibility of AI-generated surveillance evidence on reliability grounds independent of the authentication challenge
3. Legal standard: FRE 702 requires that testimony or evidence based on scientific, technical, or other specialized knowledge meet reliability standards; Daubert requires the court to act as gatekeeper; this applies to AI-generated evidence and to the systems that produce identification matches
4. The error rate problem: (a) approximately 10% plate character misread rate (2019 estimate, DHS 2025 market survey); (b) Institute for Justice Database of ALPR Abuse (Aug. 12, 2026) — source-cited wrongful stops/detentions from misreads and misinterpreted alerts, including O/0 and 7/2 character-confusion cases; (c) Roseville, CA — 71% plate misread rate on 1,427 felony/stolen Flock alerts (2023–2024; Business Insider / Roseville PD); (d) Oak Park oversight board 2025 finding that Flock cameras played no meaningful role in any crime investigation during three years of deployment; and (e) when ${vendorName} is Flock Safety or hot-list facts apply — the LAPD Office of the Inspector General audit released July 10, 2026, finding a 32.3% false positive rate on Flock hot-list alerts (161 of 498) during August–September 2025, each false alert resulting in a traffic stop of an innocent driver under high-risk stop protocol (backup, air support, supervisor; driver ordered out). Emphasize: Roseville measures upstream OCR misreads on alerts; LAPD measures false-positive actionable hot-list alerts (often stale database) — both matter; the reliability unit is cameras + database + alert. Quote the Inspector General's liability language. Note LAPD allowed its three-year contract to expire rather than renew.
5. The proposed minimum reliability threshold of no worse than 1 error per 1,000 reads (0.1%), independently verified — and argue that a 32.3% false-positive rate on actionable hot-list enforcement alerts fails any defensible FRE 702 standard for initiating armed high-risk stops
6. Argument that ${vendorName} cannot demonstrate its system meets this standard through independent testing
7. Character confusion errors (zero/O, one/I, etc.) and, separately, hot-list / database staleness failures that produce correct reads but wrongful stops
8. Ten specific discovery requests targeting accuracy testing, hot-list entry/clearance logs, verification steps before the stop, and any agency awareness of the LAPD OIG audit or similar false-positive rates before the incident date
9. Prayer for relief: exclusion or evidentiary hearing
10. Signature block placeholder
Write the complete motion. Number all argument paragraphs.`,
    access: `Draft a motion to suppress evidence obtained through ${vendorName} surveillance on Fourth Amendment grounds. Cover three prongs when facts support them: (A) unauthorized / undocumented access; (B) pretext travel-pattern stops, MYOC-style retaliatory pretextual stops, and concealment of ALPR use; (C) the ALPR network query itself as a warrantless general search under the Carpenter–Smith–Reeves tower-dump line. When droneFacts or aerial surveillance facts apply, add a curtilage / Kyllo prong.
${base}
Additional facts about this specific search (if provided by user): ${ctx.searchFacts || "not specified — draft to address the general pattern and include discovery requests to establish the specific facts"}
Requirements:
1. Caption block with full case details
2. Introduction: evidence obtained through an unconstitutional search must be suppressed under the exclusionary rule
3. Legal standard: Fourth Amendment; ALPR queries as searches when used to initiate stops; Mapp v. Ohio; Carpenter v. United States, 585 U.S. 296 (2018); United States v. Smith, 110 F.4th 817 (5th Cir. 2024) (geofence warrants); In re Four Applications… a/k/a Tower-Dump Warrants, No. 3:25-cr-00038 (S.D. Miss. Aug. 5, 2026) (Reeves, C.J.) (tower dumps per se unconstitutional as general warrants); address Whren where the stop is framed as pretextual, and Franks where material ALPR reliance was omitted from affidavits or reports
4. Access abuse pattern: Institute for Justice Database of ALPR Abuse (146 source-cited incidents, published Aug. 12, 2026 — day before Flock's mandatory-guardrails announcement); FOIA-derived ~84% of Flock searches without case numbers; named stalking and misuse cases in VENDOR FACTS
5. Argument that without case number / purpose / authorization the search cannot be distinguished from abuse
6. Structural general-warrant argument: ${vendorName} / ALPR networks passively collect location data on all vehicles and allow retroactive multi-hit sifting to identify suspects — "access to an entire haystack because it may contain a needle." Argue that warrantless ALPR queries used to build suspect / travel-pattern profiles require particularized probable cause; post-collection filtering does not cure overbreadth. Note the ALPR extension of Smith / Reeves is not yet circuit-settled — preserve the argument for appellate review. When the jurisdiction is in the Fourth Circuit, cite Schmidt v. City of Norfolk (pending) and ACLU/EFF amicus briefs; note the constitutional ALPR warrant / mass-location question is unsettled and has not been resolved in the government's favor.
7. When relevant: travel-pattern / interstate surveillance as probable-cause padding (e.g. Abrams-Phillips / I-41 Wisconsin–Michigan) — the cleanest fact pattern for the tower-dump analogy
8. When relevant: departmental SOPs or federal guidance instructing officers to hide or vaguely describe ALPR use (Wapello County "DO NOT MENTION ALPR USAGE" SOP; FBI/DOJ "as vague as permissible" guidance) as evidence of bad faith and Franks materiality
9. When relevant: Lenexa-style MYOC / First Amendment retaliation — written directives to find a pretext to stop a critic of the department aggravate the Fourth Amendment claim and support parallel § 1983 speech-retaliation theories (Nieves v. Bartlett)
10. When relevant: private-business Flock deployments where Flock contractually forced continued operation against the customer's wishes (Eagle Sports Range, Cudahy WI, 2026) — argue Flock's independent control and law-enforcement sharing support a "deeply integrated" private-surveillance / state-actor theory (as argued in San Jose) for Fourth Amendment purposes; also Millcreek, UT (Aug. 2026) unknown installer/access camera
11. When relevant: West Chester, OH (Aug. 2024) Michelle Berling conviction for tampering with Flock data and images — authentication / integrity argument
12. When relevant: low-altitude drone / aerial surveillance over curtilage — Kyllo, Jardines, Carpenter, Jones; distinguish Riley / Dow Chemical manned-aircraft cases
13. Cryptographic audit-trail failures taint vendor logs
14. Ten discovery requests including: officer query history; ALPR disclosure / SOP policy on the incident date; whether ALPR was omitted from affidavits; any warrant, court order, or supervisory authorization before the ALPR queries; any BOLO or MYOC-style alert naming the defendant; contracts / SOWs showing who controlled camera operation and termination; and (if aerial) flight logs / sensor packages
15. Prayer for suppression
16. Signature block placeholder
Write the complete motion. Number all argument paragraphs.`,
  };
}

async function generateAllDocs(env, system, ctx, enriched, vendorName, profile) {
  if (wantsOfflineGeneration(env)) {
    return buildOfflineDocs({ vendorName, profile, ctx, enriched });
  }

  const mode = getFootageCategory(ctx.footageCategory);
  const recStatus =
    ctx.footageCategory === "body_worn" ? ctx.bodyCamRecordingStatus || "recorded" : null;
  const base = `
Footage category: ${mode.label}
Source / vendor: ${vendorName}
Camera / footage type: ${ctx.cameraType || mode.label}
Body-cam recording status: ${recStatus || "n/a"}
Case: ${ctx.caseNumber} | ${ctx.defendant} | ${ctx.court} | ${ctx.jurisdiction}
${enriched}`;

  const prompts = gatewayPrompts(vendorName, ctx, base);

  const [motion, accuracy, access, civil] = await Promise.all([
    gwChat(env, system, prompts.motion),
    gwChat(env, system, prompts.accuracy),
    gwChat(env, system, prompts.access),

    // Vector 4 (+5): Civil damages / Section 1983, with First Amendment retaliation when facts fit
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
   - First Amendment retaliation (include when facts fit): if the client was tracked via ALPR after criticizing police, attending a protest, or distributing political material, plead a parallel § 1983 First Amendment retaliation theory. Cite the Lenexa, Kansas MYOC pattern (KCUR 2026) as the documented template — written directives to find a pretext to stop a critic; Nieves v. Bartlett (2019) where no probable cause exists. Emphasize the pattern is vendor-agnostic (Lenexa used Axon/Genetec/Leonardo, not Flock).
   - Second Amendment legal standard (include only when case facts indicate a firearms-related location): if the client's plate was captured at a gun range, gun store, gun show, or firearms training facility without a warrant, plead a parallel § 1983 claim under NYSRPA v. Bruen, 597 U.S. 1 (2022). Use legal-register language: "lawful activity at a firearms-related location" and the Form 4473-by-movements analogy (travel-pattern identification without the statutory framework governing ATF Form 4473) — not political campaign framing. Cite Eagle Sports Range (Cudahy, WI, 2026) when a private firearms-related business did not consent to continued collection. Reference pending H.R. 9800 (Protection Against Mass Surveillance Act, Rep. Tim Burchett) as a legislative fact. Demand discovery of: all queries against plates captured at that location; sharing with ATF/DHS/FBI; any elevated-risk categorization of frequent visitors; and the private operator's contract terms.
   - State tort claims as applicable: false arrest, false imprisonment, intentional infliction of emotional distress
4. Damages section:
   - Compensatory: detention time (calculated at an hourly rate), lost wages, medical expenses if any, property damage if any
   - Non-economic: emotional distress, humiliation, reputational harm, ongoing anxiety, chilled speech where First Amendment applies
   - Punitive: where officer conduct was reckless or malicious
   - Attorney's fees under 42 U.S.C. § 1988
   - Reference settlement ranges: $10,000–$75,000 for brief detentions; $100,000–$500,000+ for prolonged detention, physical harm, or egregious conduct
5. Reference to applicable qualified immunity landscape: note states where qualified immunity has been abolished or limited (Colorado, New Mexico) and states with active reform legislation (California, Washington)
6. Demand: specific dollar amount or demand for meaningful settlement negotiation; preservation of all records including the specific ${vendorName} query, audit logs, officer query history, BOLOs / MYOC-style alerts, and camera footage; response deadline of 30 days
7. First Amendment discovery (when Vector 5 applies): ALPR queries against the client's plate in the 90 days after public criticism; complete BOLO; communications directing officers to find stop pretexts; BOLO policy; prior civil-rights complaints involving the same supervisors
8. Notice that failure to respond will result in filing of a Section 1983 complaint in federal district court
9. Closing and signature block placeholder
10. CC line: Institute for Justice and other organizations counsel may wish to notify based on case facts (e.g., ACLU of Kansas when Lenexa-pattern First Amendment facts apply). Do not imply this tool is affiliated with or endorsed by any advocacy organization.
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

async function handleExtractCase(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  const text = body.text || body.source || "";
  const result = extractCaseFacts(text);
  return json(result);
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

  const footageCategory = FOOTAGE_CATEGORY_IDS.includes(form.footageCategory)
    ? form.footageCategory
    : "fixed_surveillance";
  const resolved = resolveFootageProfile(
    footageCategory,
    form.vendor,
    VENDORS[form.vendor] || null,
    form.customVendorName
  );
  const profile = resolved.profile;
  const vendorName = resolved.vendorName;
  const system = buildSystemPrompt(
    form.vendor,
    {
      name: form.customVendorName,
      additionalVendorFacts: form.additionalVendorFacts,
    },
    footageCategory
  );

  const offline = wantsOfflineGeneration(env);
  const modeLabel = resolved.mode.label;
  const [memoryContext, onyxContext] = offline
    ? [null, null]
    : await Promise.all([
        recallMemory(
          env,
          user.userId,
          `evidence challenge ${modeLabel} ${vendorName} ${form.jurisdiction || ""} ${form.court || ""}`
        ),
        searchOnyx(
          env,
          `FRE 901 702 Daubert ${modeLabel} body camera cellphone deepfake ALPR wrongful arrest civil rights ${vendorName} ${form.jurisdiction || ""}`
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
    additionalFacts: form.additionalFacts || "",
    footageCategory,
    bodyCamRecordingStatus: normalizeBodyCamRecordingStatus(
      form.bodyCamRecordingStatus,
      footageCategory
    ),
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
    claimUrl: `https://challengethefootage.com/evidence?claim=${encodeURIComponent(sessionId)}&code=${encodeURIComponent(claimCode)}`,
  });
}

/**
 * Rural / 2G path: one request registers hashes and delivers a gzip transcript.
 * Media (audio/video) can follow later when the link improves.
 */
async function handleEvidenceSyncLite(request, env) {
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

  let transcriptText = "";
  if (body.transcriptEncoding === "gzip+base64" && body.transcriptGzipB64) {
    try {
      transcriptText = await gunzipBase64ToText(String(body.transcriptGzipB64));
    } catch (e) {
      return json({ error: `gzip transcript decode failed: ${e.message}` }, 400);
    }
  } else if (typeof body.transcriptText === "string") {
    transcriptText = body.transcriptText;
  } else {
    return json({ error: "transcriptGzipB64 (gzip+base64) or transcriptText is required" }, 400);
  }

  // Cap inline transcript for KV (2G payloads should be far smaller).
  const MAX_CHARS = 64 * 1024;
  if (transcriptText.length > MAX_CHARS) {
    return json({ error: `Transcript exceeds ${MAX_CHARS} characters` }, 413);
  }

  const digest = await sha256Hex(transcriptText);
  if (digest !== String(transcriptHash).toLowerCase()) {
    return json({ error: "transcriptHash does not match gzip payload" }, 400);
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
    transcriptText,
    mimeType: body.mimeType,
    startedAt: body.startedAt,
    endedAt: body.endedAt,
    stateCode: body.stateCode,
    source: body.source || "native",
    claimable: true,
    claimCodeHash,
    location: body.location || null,
    incidentId: body.incidentId || null,
  });

  // Inline store transcript so a second PUT is not required on 2G.
  record.objects = record.objects || {};
  record.objects.transcript = {
    key: `inline:${sessionId}:transcript`,
    sha256: transcriptHash,
    bytes: new TextEncoder().encode(transcriptText).byteLength,
    storage: "inline",
    uploadedAt: new Date().toISOString(),
    linkTier: body.linkTier || "constrained",
  };
  record.transcriptEngine = body.transcriptEngine || null;
  record.sync = "lite";
  record.mediaPending = true;
  record.interrupted = !!body.interrupted;
  record.interruptReason = body.interruptReason || null;
  record.scenario = body.scenario || null;
  record.incidentId = body.incidentId || null;

  try {
    await env.RATE_LIMIT_KV.put(`evidence:${sessionId}`, JSON.stringify(record), {
      expirationTtl: 60 * 60 * 24 * 365 * 5,
    });
    await env.RATE_LIMIT_KV.put(
      `device:${deviceId}`,
      JSON.stringify({ deviceId, lastSessionId: sessionId, seenAt: new Date().toISOString() }),
      { expirationTtl: 60 * 60 * 24 * 365 * 5 }
    );
    if (body.incidentId) {
      await linkSessionToIncident(env, body.incidentId, deviceId, sessionId);
    }
  } catch (e) {
    console.warn("sync-lite KV:", e.message);
  }

  return json({
    sessionId: record.sessionId,
    status: record.status,
    merkleRoot: record.merkleRoot,
    securedAt: record.securedAt,
    verificationId: record.sessionId,
    claimCode,
    claimUrl: `https://challengethefootage.com/evidence?claim=${encodeURIComponent(sessionId)}&code=${encodeURIComponent(claimCode)}`,
    transcriptStored: true,
    mediaPending: true,
    interrupted: !!record.interrupted,
    incidentId: record.incidentId || null,
    sync: "lite",
  });
}

/**
 * Personal-safety alert ping (dead-man / interrupt). Stored for audit; SMS is client-side for now.
 */
async function handleEvidenceSafetyPing(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const deviceId = body.deviceId ? String(body.deviceId) : "";
  const kind = body.kind ? String(body.kind) : "";
  if (!deviceId || !kind) {
    return json({ error: "deviceId and kind are required" }, 400);
  }
  if (!["deadman", "interrupt", "manual", "checkin_ok"].includes(kind)) {
    return json({ error: "Invalid kind" }, 400);
  }

  const pingId = `ping-${deviceId.slice(0, 8)}-${Date.now().toString(36)}`;
  const record = {
    pingId,
    deviceId,
    kind,
    message: String(body.message || "").slice(0, 4000),
    scenario: body.scenario || null,
    location: body.location || null,
    sessionId: body.sessionId || null,
    localId: body.localId || null,
    interruptReason: body.interruptReason || null,
    at: body.at || new Date().toISOString(),
  };

  try {
    await env.RATE_LIMIT_KV.put(`safety-ping:${pingId}`, JSON.stringify(record), {
      expirationTtl: 60 * 60 * 24 * 90,
    });
    const indexKey = `safety-ping-index:${deviceId}`;
    let index = [];
    try {
      index = (await env.RATE_LIMIT_KV.get(indexKey, { type: "json" })) || [];
    } catch {
      index = [];
    }
    if (!Array.isArray(index)) index = [];
    index.unshift({ pingId, kind, at: record.at });
    await env.RATE_LIMIT_KV.put(indexKey, JSON.stringify(index.slice(0, 50)), {
      expirationTtl: 60 * 60 * 24 * 90,
    });
  } catch (e) {
    console.warn("safety-ping KV:", e.message);
  }

  return json({ ok: true, pingId, stored: true });
}

async function loadIncident(env, incidentId) {
  const raw = await env.RATE_LIMIT_KV.get(incidentKvKey(incidentId));
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

async function saveIncident(env, incident) {
  await env.RATE_LIMIT_KV.put(incidentKvKey(incident.incidentId), JSON.stringify(incident), {
    expirationTtl: INCIDENT_TTL,
  });
}

async function handleIncidentCreate(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  const deviceId = body.deviceId ? String(body.deviceId) : "";
  if (!deviceId) return json({ error: "deviceId is required" }, 400);

  const incidentId = randomIncidentCode();
  const incident = emptyIncident({
    incidentId,
    hostDeviceId: deviceId,
    label: body.label || "Host",
  });
  try {
    await saveIncident(env, incident);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
  return json({
    ...publicIncidentView(incident),
    joinUrl: `https://challengethefootage.com/evidence?incident=${encodeURIComponent(incidentId)}`,
  });
}

async function handleIncidentJoin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  const deviceId = body.deviceId ? String(body.deviceId) : "";
  const incidentId = body.incidentId ? String(body.incidentId).toUpperCase() : "";
  if (!deviceId || !incidentId) return json({ error: "deviceId and incidentId are required" }, 400);

  let incident;
  try {
    incident = await loadIncident(env, incidentId);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
  if (!incident) return json({ error: "Incident not found" }, 404);
  if (incident.status === "closed") return json({ error: "Incident is closed" }, 409);

  const now = new Date().toISOString();
  if (!incident.members[deviceId]) {
    incident.members[deviceId] = {
      deviceId,
      label: body.label || `Device ${Object.keys(incident.members).length + 1}`,
      joinedAt: now,
      lastBeatAt: now,
      recording: false,
      sessionId: null,
      peerLostAnnounced: false,
    };
    incident.peerEvents = [
      ...(incident.peerEvents || []),
      { at: now, type: "PEER_JOIN", deviceId, detail: "Joined incident" },
    ].slice(-100);
  } else {
    incident.members[deviceId].lastBeatAt = now;
    incident.members[deviceId].peerLostAnnounced = false;
    if (body.label) incident.members[deviceId].label = body.label;
  }

  const newLost = applyPeerTimeouts(incident);
  try {
    await saveIncident(env, incident);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
  return json({ ...publicIncidentView(incident), newPeerLost: newLost });
}

async function handleIncidentHeartbeat(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  const deviceId = body.deviceId ? String(body.deviceId) : "";
  const incidentId = body.incidentId ? String(body.incidentId).toUpperCase() : "";
  if (!deviceId || !incidentId) return json({ error: "deviceId and incidentId are required" }, 400);

  let incident;
  try {
    incident = await loadIncident(env, incidentId);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
  if (!incident) return json({ error: "Incident not found" }, 404);
  if (!incident.members[deviceId]) {
    return json({ error: "Not a member — join first" }, 403);
  }

  const now = new Date().toISOString();
  incident.members[deviceId].lastBeatAt = now;
  incident.members[deviceId].peerLostAnnounced = false;
  if (typeof body.recording === "boolean") {
    incident.members[deviceId].recording = body.recording;
  }
  if (body.sessionId) incident.members[deviceId].sessionId = body.sessionId;
  if (body.label) incident.members[deviceId].label = body.label;

  const newLost = applyPeerTimeouts(incident);
  try {
    await saveIncident(env, incident);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
  return json({
    ...publicIncidentView(incident),
    newPeerLost: newLost,
    ackAt: now,
  });
}

async function handleIncidentSignal(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  const deviceId = body.deviceId ? String(body.deviceId) : "";
  const incidentId = body.incidentId ? String(body.incidentId).toUpperCase() : "";
  const type = body.type ? String(body.type) : "";
  if (!deviceId || !incidentId || !type) {
    return json({ error: "deviceId, incidentId, and type are required" }, 400);
  }
  if (!["start", "stop", "idle"].includes(type)) {
    return json({ error: "type must be start|stop|idle" }, 400);
  }

  let incident;
  try {
    incident = await loadIncident(env, incidentId);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
  if (!incident) return json({ error: "Incident not found" }, 404);
  if (!incident.members[deviceId]) {
    return json({ error: "Not a member" }, 403);
  }

  const now = new Date().toISOString();
  incident.signal = { type, at: now, byDeviceId: deviceId };
  if (type === "start") {
    incident.status = "recording";
    for (const m of Object.values(incident.members)) {
      m.peerLostAnnounced = false;
    }
  } else if (type === "stop") {
    incident.status = "closed";
    for (const m of Object.values(incident.members)) {
      m.recording = false;
    }
  } else {
    incident.status = "open";
  }
  incident.peerEvents = [
    ...(incident.peerEvents || []),
    {
      at: now,
      type: type === "start" ? "START" : type === "stop" ? "STOP" : "IDLE",
      deviceId,
      detail: `Signal ${type}`,
    },
  ].slice(-100);

  try {
    await saveIncident(env, incident);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
  return json(publicIncidentView(incident));
}

async function handleIncidentGet(_request, env, incidentId) {
  const id = String(incidentId || "").toUpperCase();
  if (!id) return json({ error: "Missing incident id" }, 400);
  let incident;
  try {
    incident = await loadIncident(env, id);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
  if (!incident) return json({ error: "Not found" }, 404);
  applyPeerTimeouts(incident);
  try {
    await saveIncident(env, incident);
  } catch {
    // still return view
  }
  return json(publicIncidentView(incident));
}

async function linkSessionToIncident(env, incidentId, deviceId, sessionId) {
  if (!incidentId || !deviceId || !sessionId) return;
  try {
    const incident = await loadIncident(env, String(incidentId).toUpperCase());
    if (!incident || !incident.members[deviceId]) return;
    incident.members[deviceId].sessionId = sessionId;
    incident.members[deviceId].lastBeatAt = new Date().toISOString();
    await saveIncident(env, incident);
  } catch (e) {
    console.warn("linkSessionToIncident:", e.message);
  }
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

async function assertEvidenceUploadAuth(env, sessionId, { deviceId, claimCode, bearerUser }) {
  const raw = await env.RATE_LIMIT_KV.get(`evidence:${sessionId}`);
  if (!raw) throw Object.assign(new Error("Session not found"), { status: 404 });
  const record = JSON.parse(raw);

  if (bearerUser && record.userId && record.userId === bearerUser.userId) {
    return record;
  }
  if (deviceId && claimCode && record.deviceId === deviceId && record.claimCodeHash) {
    const given = await sha256Hex(String(claimCode));
    if (given === record.claimCodeHash) return record;
    // After claim, claimCodeHash is cleared — allow deviceId match + known claimed owner upload window
  }
  if (deviceId && record.deviceId === deviceId && record.userId) {
    // Claimed sessions: device may still finish blob uploads briefly
    return record;
  }
  throw Object.assign(new Error("Not authorized to upload for this session"), { status: 403 });
}

async function handleEvidenceUploadUrl(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { sessionId, artifactType, contentType, sha256, deviceId, claimCode } = body;
  if (!sessionId || !artifactType || !contentType || !sha256) {
    return json({ error: "sessionId, artifactType, contentType, and sha256 are required" }, 400);
  }
  if (!["transcript", "audio", "video"].includes(artifactType)) {
    return json({ error: "artifactType must be transcript|audio|video" }, 400);
  }

  let bearerUser = null;
  try {
    bearerUser = await resolveUser(request, env);
  } catch {
    bearerUser = null;
  }

  try {
    await assertEvidenceUploadAuth(env, sessionId, { deviceId, claimCode, bearerUser });
  } catch (e) {
    return json({ error: e.message }, e.status || 403);
  }

  const ext =
    artifactType === "transcript"
      ? "txt"
      : artifactType === "audio"
        ? "m4a"
        : contentType.includes("webm")
          ? "webm"
          : "mp4";
  const key = `evidence/${sessionId}/${artifactType}-${sha256.slice(0, 16)}.${ext}`;

  // Always use Worker-proxied PUT so clients never need AWS4.
  const origin = new URL(request.url).origin;
  const uploadUrl = `${origin}/api/evidence/object/${encodeURIComponent(sessionId)}/${encodeURIComponent(artifactType)}`;

  try {
    await env.RATE_LIMIT_KV.put(
      `evidence-upload:${sessionId}:${artifactType}`,
      JSON.stringify({
        sessionId,
        artifactType,
        contentType,
        sha256,
        key,
        deviceId: deviceId || null,
        createdAt: new Date().toISOString(),
        r2Ready: r2Configured(env),
      }),
      { expirationTtl: 60 * 60 * 24 }
    );
  } catch (e) {
    console.warn("upload meta:", e.message);
  }

  return json({
    uploadUrl,
    key,
    storage: r2Configured(env) ? "r2" : "metadata_only",
  });
}

async function handleEvidenceObjectPut(request, env, sessionId, artifactType) {
  if (!sessionId || !artifactType) return json({ error: "Missing path" }, 400);

  const deviceId = request.headers.get("X-Device-Id") || "";
  const claimCode = request.headers.get("X-Claim-Code") || "";
  const contentSha = (request.headers.get("X-Content-SHA256") || "").toLowerCase();
  const contentType = request.headers.get("Content-Type") || "application/octet-stream";

  let bearerUser = null;
  try {
    bearerUser = await resolveUser(request, env);
  } catch {
    bearerUser = null;
  }

  let record;
  try {
    record = await assertEvidenceUploadAuth(env, sessionId, { deviceId, claimCode, bearerUser });
  } catch (e) {
    return json({ error: e.message }, e.status || 403);
  }

  const metaRaw = await env.RATE_LIMIT_KV.get(`evidence-upload:${sessionId}:${artifactType}`);
  if (!metaRaw) return json({ error: "Upload URL expired or not created" }, 400);
  const meta = JSON.parse(metaRaw);
  if (contentSha && meta.sha256 && contentSha !== meta.sha256.toLowerCase()) {
    return json({ error: "X-Content-SHA256 does not match registered hash" }, 400);
  }

  const body = await request.arrayBuffer();
  if (!body.byteLength) return json({ error: "Empty body" }, 400);

  let putResult;
  try {
    putResult = await r2PutObject(env, {
      key: meta.key,
      body,
      contentType: meta.contentType || contentType,
      sha256: meta.sha256,
    });
  } catch (e) {
    return json({ error: `Storage failed: ${e.message}` }, 500);
  }

  const objects = record.objects || {};
  objects[artifactType] = {
    key: meta.key,
    sha256: meta.sha256,
    bytes: body.byteLength,
    storage: putResult.storage,
    uploadedAt: new Date().toISOString(),
  };
  record.objects = objects;
  if (record.objects.audio && record.objects.video) {
    record.mediaPending = false;
  }
  try {
    await env.RATE_LIMIT_KV.put(`evidence:${sessionId}`, JSON.stringify(record), {
      expirationTtl: 60 * 60 * 24 * 365 * 5,
    });
  } catch (e) {
    console.warn("evidence object index:", e.message);
  }

  return json({
    ok: true,
    key: meta.key,
    bytes: body.byteLength,
    storage: putResult.storage,
    skipped: !!putResult.skipped,
  });
}

async function persistEvidenceRecord(env, input) {
  const securedAt = new Date().toISOString();
  const merkleRoot = await evidenceMerkleRoot(
    input.transcriptHash,
    input.audioHash,
    input.videoHash
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
    incidentId: input.incidentId || null,
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
    const verificationRef = record.verificationRef || null;
    return json({
      sessionId: record.sessionId,
      status: record.status,
      securedAt: record.securedAt,
      transcriptHash: record.transcriptHash,
      audioHash: record.audioHash,
      videoHash: record.videoHash,
      merkleRoot: record.merkleRoot,
      // External anchor id when ClawQL anchored (often an Arweave tx). Null until anchored.
      verificationRef,
      source: record.source,
      claimable: !!record.claimable,
      independentlyVerifiable: record.status === "anchored" && !!verificationRef,
      mediaPending: !!record.mediaPending,
      interrupted: !!record.interrupted,
      interruptReason: record.interruptReason || null,
      scenario: record.scenario || null,
      incidentId: record.incidentId || null,
      sync: record.sync || null,
      // Attorney / court checklist — audio+video hashes are authoritative; STT may be imperfect.
      howToVerify: [
        "Confirm merkleRoot equals SHA-256 of transcriptHash + ':' + audioHash + ':' + videoHash (lowercase hex).",
        "Hash the transcript, audio, and video files with SHA-256; each digest must match this response.",
        verificationRef
          ? `If status is anchored, retrieve the external record for verificationRef (${verificationRef}) and confirm it commits to the same merkleRoot.`
          : "If status is not yet anchored, hashes + merkleRoot are still the local integrity commitment; re-check after ClawQL anchoring completes.",
        "Treat the transcript as a convenience layer (on-device STT). Audio and video bytes remain authoritative if wording differs.",
      ],
      objects: record.objects
        ? Object.fromEntries(
            Object.entries(record.objects).map(([k, v]) => [
              k,
              { bytes: v.bytes, uploadedAt: v.uploadedAt, storage: v.storage },
            ])
          )
        : undefined,
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
