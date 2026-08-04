/**
 * Offline document template unit tests (no Worker / network).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildOfflineDocs } from "../offline-docs.js";

describe("offline document templates", () => {
  const ctx = {
    caseNumber: "24-CR-8841",
    defendant: "Jordan Avery Lee",
    court: "Superior Court of California, County of Alameda",
    jurisdiction: "State of California",
    city: "Oakland",
    cameraType: "Flock Safety ALPR fixed camera",
    searchFacts:
      "Officer queried plate 7XKR492 on 2024-11-03 without a case number in the audit log export.",
    civilHarm:
      "Client detained at gunpoint for 40 minutes after a misread plate; released with no citation.",
  };

  const profile = {
    name: "Flock Safety",
    authFacts: ["No public Merkle anchoring documentation."],
    errorRateFacts: ["Approximately 10% plate misread estimate cited in industry reporting."],
    accessAbuseFacts: ["Documented personal-use queries in multiple jurisdictions."],
    civilFacts: ["Section 1983 claims for wrongful ALPR stops."],
    sources: ["Institute for Justice"],
  };

  it("embeds case caption fields in all four docs", () => {
    const docs = buildOfflineDocs({
      vendorName: "Flock Safety",
      profile,
      ctx,
      enriched: "ADDITIONAL FACTS:\nWitness session ws-demo-1",
    });
    for (const key of ["motion", "accuracy", "access", "civil"]) {
      assert.equal(typeof docs[key], "string");
      assert.match(docs[key], /24-CR-8841/);
      assert.match(docs[key], /Jordan Avery Lee/i);
      assert.match(docs[key], /Flock Safety/);
      assert.ok(docs[key].length > 800, `${key} too short`);
    }
    assert.match(docs.motion, /FRE 901/);
    assert.match(docs.accuracy, /FRE 702|Daubert/);
    assert.match(docs.access, /Fourth Amendment/);
    assert.match(docs.civil, /1983/);
    assert.match(docs.access, /7XKR492/);
    assert.match(docs.civil, /detained at gunpoint/);
    assert.match(docs.motion, /Witness session ws-demo-1/);
  });

  it("includes ten discovery requests per motion type", () => {
    const docs = buildOfflineDocs({
      vendorName: "Flock Safety",
      profile,
      ctx,
      enriched: "",
    });
    for (const key of ["motion", "accuracy", "access"]) {
      assert.match(docs[key], /10\. /);
    }
  });
});
