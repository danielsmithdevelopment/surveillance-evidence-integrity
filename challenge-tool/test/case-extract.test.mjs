/**
 * Case fact extraction — Feder / Isaacs / Berling sample texts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractCaseFacts } from "../case-extract.js";

const FEDER = `
Plymouth, Minnesota police stopped Joel Feder and his wife in a Kohl's parking lot on June 28, 2026
after Flock Safety cameras tracked their vehicle for two days. Officers received Flock alerts on
June 26 and June 28. The alert was based on an incomplete NCIC entry "34 DTM" instead of the correct
plate "34 10 DTM" entered by a California Jaguar Land Rover dealership. Husband and wife were ordered
out of the vehicle and patted down in a high-risk stop involving four police vehicles. Plymouth PD
operates 18 Flock cameras generating 580,000 plate reads and 14,800 hotlist hits in a recent 30-day
period according to the Flock transparency portal. No case number was opened before tracking began.
Body camera footage was obtained and published. No charges were filed.
`;

const ISAACS = `
Florida Highway Patrol arrested Lindsey Isaacs on eight felony counts including vehicular homicide
after a Flock license-plate reader camera captured her black Dodge Durango traveling eastbound on I-4
at the Seminole/Volusia County line at 9:51pm. The crash occurred at 9:53pm three miles away. She spent
13 days in jail in Volusia County, Florida before charges were dropped. Investigators later determined
Flock cannot distinguish vehicle color — the actual suspect drove a maroon Durango. Witness partial
plate did not match. No warrant was obtained for Flock data before arrest. The arrest report cites
the Flock capture as the primary investigative lead. Civil lawsuit filed naming two FHP sergeants.
Attorney Patrick McGeehan. Case pending in Volusia County Circuit Court.
`;

const BERLING = `
Former West Chester, Ohio officer Michelle Berling was convicted in August 2024 and sentenced to
five years probation for tampering with Flock Safety data and images. This is the only documented
criminal conviction for evidence tampering using the Flock system. Authorized users with legitimate
access can manipulate Flock records — relevant to FRE 901 authentication challenges.
`;

describe("extractCaseFacts", () => {
  it("extracts Feder / Plymouth partial-plate wrongful stop", () => {
    const { fields, filled } = extractCaseFacts(FEDER);
    assert.equal(fields.vendor, "flock");
    assert.match(fields.city || "", /Plymouth/i);
    assert.match(fields.jurisdiction || "", /Minnesota/i);
    assert.match(fields.defendant || "", /Joel Feder/i);
    assert.match(fields.additionalFacts || fields.searchFacts || "", /34 DTM/i);
    assert.match(fields.additionalFacts || fields.searchFacts || "", /34 10 DTM/i);
    assert.match(fields.searchFacts || "", /580,?000|14,?800|hotlist/i);
    assert.match(
      fields.civilHarm || fields.additionalFacts || "",
      /gunpoint|patted down|high-risk/i
    );
    assert.ok(filled.includes("searchFacts"));
  });

  it("extracts Isaacs / Volusia wrongful imprisonment", () => {
    const { fields } = extractCaseFacts(ISAACS);
    assert.equal(fields.vendor, "flock");
    assert.match(fields.defendant || "", /Lindsey Isaacs/i);
    assert.match(fields.jurisdiction || "", /Florida/i);
    assert.match(fields.court || "", /Circuit Court/i);
    assert.match(fields.civilHarm || "", /13 days|vehicular homicide|eight felony/i);
    assert.match(
      fields.searchFacts || fields.additionalFacts || "",
      /9:51|I-4|warrant|investigative lead/i
    );
    assert.match(fields.additionalFacts || fields.searchFacts || "", /maroon|black|Durango|color/i);
  });

  it("extracts Berling tampering for authentication matters", () => {
    const { fields } = extractCaseFacts(BERLING);
    assert.equal(fields.vendor, "flock");
    assert.match(fields.city || "", /West Chester/i);
    assert.match(fields.jurisdiction || "", /Ohio/i);
    assert.match(fields.civilHarm || fields.additionalFacts || "", /Berling|tampering|probation/i);
  });

  it("returns guidance for short paste", () => {
    const { fields, notes } = extractCaseFacts("Too short.");
    assert.deepEqual(fields, {});
    assert.ok(notes.length > 0);
  });
});
