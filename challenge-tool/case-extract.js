/**
 * Heuristic extraction of challenge form fields from pasted articles,
 * police statements, or arrest-report summaries. Used client-side and by
 * POST /api/extract-case (offline path; gateway enhancement optional later).
 */

const VENDOR_PATTERNS = [
  { id: "flock", re: /\bflock(?:\s+safety)?\b/i },
  { id: "axon", re: /\baxon(?:\s+evidence|\s+body)?\b/i },
  { id: "motorola", re: /\b(?:motorola|vigilant)\b/i },
  { id: "genetec", re: /\bgenetec\b/i },
  { id: "verkada", re: /\bverkada\b/i },
];

const STATE_NAMES = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

function firstMatch(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m;
  }
  return null;
}

function detectVendor(text) {
  for (const { id, re } of VENDOR_PATTERNS) {
    if (re.test(text)) return id;
  }
  return null;
}

function detectCity(text) {
  const county = firstMatch(text, [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+County),\s*(Florida|Minnesota|Ohio|California|Texas|Georgia|[A-Z]{2})\b/,
  ]);
  if (county) {
    const name = county[1];
    const tail = county[2];
    const st =
      tail.length === 2
        ? tail
        : Object.entries(STATE_NAMES).find(([, n]) => n.toLowerCase() === tail.toLowerCase())?.[0];
    return st ? `${name}, ${st}` : name;
  }

  const citySt = firstMatch(text, [
    /\b(Plymouth|West Chester|Roseville|Toledo|Morristown|San Diego|Auburn|Volusia),\s*(Minnesota|MN|Florida|FL|Ohio|OH|California|CA|Washington|WA|Utah|UT)\b/i,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2})\b/,
  ]);
  if (citySt) {
    const city = citySt[1];
    let st = citySt[2];
    if (/jail|spent|days|police|highway/i.test(city)) return "";
    if (st.length > 2) {
      const abbr = Object.entries(STATE_NAMES).find(
        ([, n]) => n.toLowerCase() === st.toLowerCase()
      )?.[0];
      if (abbr) st = abbr;
    }
    if (city.length <= 40) return `${city}, ${st}`;
  }
  return "";
}

function detectJurisdiction(text, city) {
  const stInCity = city.match(/,\s*([A-Z]{2})$/)?.[1];
  if (stInCity && STATE_NAMES[stInCity]) return STATE_NAMES[stInCity];

  for (const [abbr, name] of Object.entries(STATE_NAMES)) {
    const re = new RegExp(`\\b${name}\\b|\\b${abbr}\\b`, "i");
    if (re.test(text)) return name;
  }
  return "";
}

function detectCourt(text, city) {
  const explicit = firstMatch(text, [
    /((?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+)?(?:Circuit|Superior|District|County)\s+Court[^.\n]{0,80})/i,
    /(Volusia County Circuit Court)/i,
  ]);
  if (explicit) return explicit[1].trim();

  if (/circuit court/i.test(text) && city) {
    const county = city.match(/^(.+ County)/)?.[1];
    if (county) return `${county} Circuit Court`;
  }
  return "";
}

function detectCaseNumber(text) {
  const m = firstMatch(text, [
    /case\s+(?:no\.?|number|#)\s*[:\s]*([A-Z0-9][A-Z0-9\-/]{2,40})/i,
    /\b(\d{2,4}-CR-\d+)\b/i,
    /\b(CR-\d{4}-\d+)\b/i,
  ]);
  if (m) return m[1].trim();
  if (/no charges filed|charges dropped|N\/A/i.test(text)) return "N/A (no active prosecution)";
  return "";
}

function detectDefendant(text) {
  const arrested = firstMatch(text, [
    /\barrested\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+was (?:arrested|charged|jailed)/,
    /(?:defendant|client)\s*[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i,
  ]);
  if (arrested) return arrested[1].trim();

  const wrongStop = firstMatch(text, [
    /\b(Joel Feder(?:\s+and\s+(?:his\s+)?wife)?)\b/i,
    /stopped\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:and|in|at)/i,
  ]);
  if (wrongStop) return wrongStop[1].trim();

  if (/Berling|evidence tampering|authentication/i.test(text)) {
    return "Matter involving Flock data integrity (see additional facts)";
  }
  return "";
}

function detectCameraType(text, vendorId) {
  if (/\bbody[- ]?worn|\bbwc\b|\bbody camera\b/i.test(text)) {
    return "Body-worn camera";
  }
  if (/\bcell\s*phone|iphone|android|personal device video/i.test(text)) {
    return "Cell phone / personal device video";
  }
  if (/\b(?:ALPR|license plate reader|plate reader|LPR)\b/i.test(text)) {
    const vendor = vendorId === "flock" ? "Flock Safety" : vendorId ? vendorId : "";
    return vendor
      ? `Fixed ALPR / License Plate Reader — ${vendor}`
      : "Fixed ALPR / License Plate Reader";
  }
  if (vendorId === "flock") return "Fixed ALPR / License Plate Reader — Flock Safety";
  return "";
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

function pickSentences(sentences, patterns) {
  return sentences.filter((s) => patterns.some((re) => re.test(s))).join(" ");
}

export function extractCaseFacts(rawText) {
  const text = String(rawText || "").trim();
  const filled = [];
  const notes = [];

  if (text.length < 80) {
    return {
      fields: {},
      filled: [],
      notes: ["Paste at least a short paragraph (80+ characters) for extraction."],
      mode: "heuristic",
    };
  }

  const vendor = detectVendor(text);
  if (vendor) filled.push("vendor");

  const city = detectCity(text);
  if (city) filled.push("city");

  const jurisdiction = detectJurisdiction(text, city);
  if (jurisdiction) filled.push("jurisdiction");

  const court = detectCourt(text, city);
  if (court) filled.push("court");

  const caseNumber = detectCaseNumber(text);
  if (caseNumber) filled.push("caseNumber");

  const defendant = detectDefendant(text);
  if (defendant) filled.push("defendant");

  const cameraType = detectCameraType(text, vendor);
  if (cameraType) filled.push("cameraType");

  const sentences = splitSentences(text);

  const searchFacts = pickSentences(sentences, [
    /\b(?:case number|hotlist|hot-list|NCIC|query|queried|tracked|alert|Flock capture|license.?plate reader|warrant|investigative lead|transparency portal|\d[\d,]* plate reads|\d[\d,]* hotlist)/i,
  ]);

  const civilHarm = pickSentences(sentences, [
    /\b(?:jail(?:ed)?|gunpoint|wrongful|detention|detained|patted down|high-risk stop|felony count|vehicular homicide|false imprisonment|13 days|probation|tampering|convicted|damages|lost wages)/i,
  ]);

  let additionalFacts = pickSentences(sentences, [
    /\b(?:plate|misread|partial|NCIC|dealership|Durango|maroon|black|officer|police|Flock|stopped|arrest)/i,
  ]);

  if (!additionalFacts) {
    additionalFacts = sentences.slice(0, 4).join(" ");
  }

  if (searchFacts) filled.push("searchFacts");
  if (civilHarm) filled.push("civilHarm");
  if (additionalFacts) filled.push("additionalFacts");

  if (!vendor && /\b(?:surveillance|camera|ALPR|plate reader)\b/i.test(text)) {
    notes.push("Vendor not identified — defaulting to Flock Safety if ALPR facts present.");
  }
  if (!defendant) notes.push("Defendant / client name not detected — fill manually.");
  if (!caseNumber)
    notes.push("Case number not detected — use N/A for pre-litigation wrongful stops.");

  const fields = {
    ...(vendor
      ? { vendor }
      : /\bALPR|license plate reader|Flock\b/i.test(text)
        ? { vendor: "flock" }
        : {}),
    ...(caseNumber ? { caseNumber } : {}),
    ...(defendant ? { defendant } : {}),
    ...(court ? { court } : {}),
    ...(jurisdiction ? { jurisdiction } : {}),
    ...(city ? { city } : {}),
    ...(cameraType ? { cameraType } : {}),
    ...(additionalFacts ? { additionalFacts } : {}),
    ...(searchFacts ? { searchFacts } : {}),
    ...(civilHarm ? { civilHarm } : {}),
  };

  return { fields, filled, notes, mode: "heuristic" };
}
