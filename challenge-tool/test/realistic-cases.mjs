#!/usr/bin/env node
/**
 * Realistic case-pack generation against a running wrangler dev server.
 *
 * Cases: Feder/Plymouth MN, Isaacs/Volusia FL, Berling/West Chester OH.
 *
 * Usage:
 *   npm run worker                 # terminal 1
 *   node test/realistic-cases.mjs  # terminal 2
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.CTF_BASE || "http://127.0.0.1:8787";
const TOKEN = process.env.CTF_TEST_TOKEN || "test:realistic-cases:pd.test@example.com";
const outRoot = join(dirname(fileURLToPath(import.meta.url)), "../../.artifacts/realistic-cases");

const CASES = [
  {
    id: "feder-plymouth-mn",
    label: "Joel Feder / Plymouth, MN (wrongful stop)",
    payload: {
      tosAccepted: true,
      footageCategory: "fixed_surveillance",
      vendor: "flock",
      caseNumber: "N/A (no charges filed)",
      defendant: "N/A (wrongful stop, no arrest — Joel Feder and spouse)",
      court: "N/A — civil / pre-litigation demand",
      jurisdiction: "Minnesota",
      city: "Plymouth, MN",
      cameraType: "Fixed ALPR / License Plate Reader — Flock Safety",
      additionalFacts:
        'June 28, 2026 Kohl\'s parking lot stop. Four police vehicles. Husband and wife ordered out, patted down. Root cause: California Jaguar Land Rover dealership entered incomplete plate "34 DTM" into NCIC; correct plate is "34 10 DTM." Flock matched the partial plate and generated repeated alerts. Officers tracked the vehicle for two days (alerts June 26 and June 28) and did not verify plate format before the armed stop. Body camera footage obtained and published (The Drive). Flock CEO Garrett Langley later interviewed Feder.',
      searchFacts:
        "Plymouth PD operated 18 Flock cameras generating 580,000 plate reads and 14,800 hotlist hits in a recent 30-day period (Flock transparency portal). Officers received Flock alerts on June 26 and June 28. Alert based on NCIC entry made in California by a Jaguar Land Rover dealership. No case number was opened before tracking began. Officers tracked the vehicle for multiple days before initiating the stop.",
      civilHarm:
        'Wrongful stop and detention at gunpoint by four police vehicles in Kohl\'s parking lot, June 28, 2026. Officers tracked vehicle for two days using Flock cameras. Husband and wife ordered out of vehicle, patted down. Root cause: California dealership entered incomplete plate "34 DTM" into NCIC; correct plate is "34 10 DTM." Flock system matched partial plate and generated repeated alerts. Officers did not verify plate format before initiating armed stop. Body camera footage obtained and published.',
    },
    checks: {
      motion: [
        /Berling|tampering with Flock data/i,
        /Millcreek|unknown.*(install|access)/i,
        /hash|cryptographic|FRE 901/i,
      ],
      accuracy: [
        /34 DTM/,
        /34 10 DTM/,
        /Roseville|71%|32\.3%|LAPD|IJ Database|Institute for Justice/i,
        /partial plate|character|misread|NCIC/i,
      ],
      access: [/580,?000|14,?800|18 Flock/i, /case number/i, /June 26|June 28|tracked/i],
      civil: [
        /gunpoint|Kohl'?s|wrongful stop/i,
        /34 DTM|34 10 DTM/,
        /580,?000|14,?800|transparency|Plymouth/i,
        /§\s*1983|1983|\$100,?000|settlement|damages/i,
      ],
    },
  },
  {
    id: "isaacs-volusia-fl",
    label: "Lindsey Isaacs / Volusia County, FL (13-day wrongful imprisonment)",
    payload: {
      tosAccepted: true,
      footageCategory: "fixed_surveillance",
      vendor: "flock",
      caseNumber:
        "Volusia County / FHP investigation — charges dropped (case no. per arrest report)",
      defendant: "Lindsey Isaacs",
      court: "Volusia County Circuit Court",
      jurisdiction: "Florida",
      city: "Volusia County, FL",
      cameraType: "Fixed ALPR / License Plate Reader — Flock Safety",
      additionalFacts:
        "Wrongful arrest on eight felony counts including vehicular homicide based on Flock ALPR placing vehicle \"in the area\" of a fatal crash. Client spent 13 days in jail. Charges dropped after SIRT investigators determined: (1) Flock placed client's black Dodge Durango 3 miles west of crash scene at 9:51pm; crash occurred at 9:53pm — time-distance analysis proved vehicle was past the scene; (2) Flock cannot distinguish vehicle color — actual suspect drove a maroon Durango, not black; (3) partial plate provided by witnesses did not match client's plate; (4) client's vehicle had no visible damage. Civil lawsuit filed naming two FHP sergeants for false imprisonment. Attorney: Patrick McGeehan. Real suspect Alisa Montalvo subsequently arrested and charged with three counts vehicular homicide. Court documents / arrest report language published by WFTV / WESH.",
      searchFacts:
        "Flock ALPR captured license plate traveling eastbound on I-4 at Seminole/Volusia County line at 9:51pm. Troopers used this as primary basis for investigation despite: plate location being 3 miles from crash; vehicle color mismatch (black vs maroon); partial plate from witnesses not matching. No warrant obtained for Flock data before arrest. Arrest report cites Flock capture as investigative lead.",
      civilHarm:
        "Wrongful arrest on eight felony counts including vehicular homicide based on Flock ALPR placing vehicle in the area of a fatal crash. Client spent 13 days in jail. Charges dropped. Civil lawsuit filed naming two FHP sergeants. Real suspect Alisa Montalvo subsequently arrested.",
    },
    checks: {
      motion: [
        /Berling|tampering/i,
        /chain of custody|hash|FRE 901|preserved|arrest report/i,
        /Flock/i,
      ],
      accuracy: [
        /color|maroon|black|Durango|appearance/i,
        /9:51|9:53|3 miles|time-distance|partial plate/i,
        /Roseville|71%|32\.3%|IJ Database|misread/i,
      ],
      access: [/warrant|9:51|I-4|case number|investigative lead/i],
      civil: [
        /13 days|vehicular homicide|eight felony/i,
        /\$100,?000|\$500,?000|damages|imprisonment/i,
        /Volusia|Isaacs|false imprisonment|1983/i,
      ],
    },
  },
  {
    id: "berling-west-chester-oh",
    label: "Michelle Berling / West Chester, OH (evidence tampering — FRE 901)",
    payload: {
      tosAccepted: true,
      footageCategory: "fixed_surveillance",
      vendor: "flock",
      caseNumber: "West Chester / Butler County — Berling criminal matter (Aug 2024)",
      defendant: "Matter involving Flock data integrity (Berling tampering conviction)",
      court: "Ohio courts — West Chester / Butler County",
      jurisdiction: "Ohio",
      city: "West Chester, OH",
      cameraType: "Fixed ALPR / License Plate Reader — Flock Safety",
      additionalFacts:
        "Former officer Michelle Berling was convicted and sentenced to five years probation for tampering with Flock data and images (August 2024). This is the only documented criminal conviction for tampering with Flock system data. Use this matter to test whether FRE 901 authentication motions surface the tampering conviction when Flock is the vendor.",
      searchFacts:
        "Authorized system user manipulated Flock data and images. Conviction establishes deliberate manipulation risk by users with legitimate access — not only external attackers.",
      civilHarm:
        "Evidence tampering. Former officer Michelle Berling convicted and sentenced to five years probation for tampering with Flock data and images. West Chester, OH, August 2024. This is the only documented criminal conviction for tampering with Flock system data.",
    },
    checks: {
      motion: [
        /Michelle Berling/,
        /tampering with Flock data/i,
        /five years|probation|August 2024/i,
        /authorized|manipulation|integrity/i,
      ],
      accuracy: [/Flock|error|misread|IJ|Roseville|LAPD/i],
      access: [/Berling|tamper|authorized|case number|abuse/i],
      civil: [/Berling|tamper|integrity|1983/i],
    },
  },
];

function scoreDoc(text, patterns) {
  const hits = [];
  const misses = [];
  for (const re of patterns) {
    if (re.test(text)) hits.push(re.toString());
    else misses.push(re.toString());
  }
  return { hits, misses, ok: misses.length === 0 };
}

async function generate(payload) {
  const res = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`generate ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  console.log("health:", health);
  mkdirSync(outRoot, { recursive: true });

  const summary = {
    generatedAt: new Date().toISOString(),
    health,
    cases: [],
  };

  for (const c of CASES) {
    console.log("\n===", c.label, "===");
    const body = await generate(c.payload);
    const dir = join(outRoot, c.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "meta.json"),
      JSON.stringify({ ...body.meta, sessionId: body.sessionId }, null, 2)
    );

    const caseResult = {
      id: c.id,
      label: c.label,
      sessionId: body.sessionId,
      mode: body.meta?.generationMode,
      docs: {},
    };

    for (const [key, text] of Object.entries(body.docs)) {
      writeFileSync(join(dir, `${key}.txt`), text);
      const check = c.checks[key] ? scoreDoc(text, c.checks[key]) : null;
      caseResult.docs[key] = {
        chars: text.length,
        ...(check || {}),
      };
      console.log(
        `  ${key}: ${text.length} chars` +
          (check ? ` — ${check.ok ? "PASS" : "FAIL"} (miss ${check.misses.length})` : "")
      );
      if (check && !check.ok) {
        console.log("    misses:", check.misses.join("; "));
      }
    }

    summary.cases.push(caseResult);
  }

  writeFileSync(join(outRoot, "summary.json"), JSON.stringify(summary, null, 2));
  const failed = summary.cases.filter((c) => Object.values(c.docs).some((d) => d.ok === false));
  console.log("\nWrote", outRoot);
  console.log(
    failed.length
      ? `RESULT: ${failed.length}/${summary.cases.length} cases had check failures`
      : `RESULT: all ${summary.cases.length} cases passed checks`
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
