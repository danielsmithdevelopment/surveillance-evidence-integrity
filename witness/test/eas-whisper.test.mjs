/**
 * EAS / Whisper scaffolding contract tests.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("EAS + Whisper scaffold", () => {
  it("ships fetch script, metro bin support, and BUILD.md", () => {
    assert.ok(existsSync(join(root, "scripts/fetch-whisper-model.mjs")));
    assert.ok(existsSync(join(root, "BUILD.md")));
    assert.ok(existsSync(join(root, "metro.config.js")));
    assert.ok(existsSync(join(root, "app.config.js")));
    const metro = readFileSync(join(root, "metro.config.js"), "utf8");
    assert.match(metro, /assetExts.*bin|push\("bin"\)/);
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    assert.equal(pkg.scripts["whisper:fetch"], "node scripts/fetch-whisper-model.mjs");
    assert.equal(pkg.scripts["eas-build-pre-install"], "node scripts/fetch-whisper-model.mjs");
    assert.ok(pkg.optionalDependencies?.["whisper.rn"] || pkg.dependencies?.["whisper.rn"]);
  });

  it("eas profiles enable EXPO_PUBLIC_WHISPER", () => {
    const eas = JSON.parse(readFileSync(join(root, "eas.json"), "utf8"));
    for (const name of ["development", "preview", "production"]) {
      assert.equal(eas.build[name].env.EXPO_PUBLIC_WHISPER, "1");
    }
  });

  it("generated model module is null until fetch", async () => {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const mod = require("../src/whisper-model.generated.js");
    assert.equal(mod, null);
  });

  it("App exposes Wi-Fi model prep and realtime Whisper wiring", () => {
    const app = readFileSync(join(root, "App.tsx"), "utf8");
    assert.match(app, /downloadWhisperModel/);
    assert.match(app, /supportsRealtime/);
    assert.match(app, /Download speech model/);
  });
});
