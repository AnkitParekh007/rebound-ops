import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  loadScreenshotSet,
  screenshotIds,
} from "../scripts/screenshot-artifacts.mjs";
function fixture(t) {
  const directory = mkdtempSync(path.join(tmpdir(), "marketing-manifest-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const image = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(image);
  image.write("IHDR", 12);
  image.writeUInt32BE(1440, 16);
  image.writeUInt32BE(1000, 20);
  for (const id of screenshotIds)
    writeFileSync(path.join(directory, `${id}.png`), image);
  const manifest = {
    schemaVersion: 1,
    sourceSha: "a".repeat(40),
    capturedAt: "2026-11-01T09:00:00.000Z",
    screenshots: screenshotIds.map((id) => ({
      id,
      filename: `${id}.png`,
      width: 1440,
      height: 1000,
      sha256: createHash("sha256").update(image).digest("hex"),
    })),
  };
  const save = () =>
    writeFileSync(
      path.join(directory, "manifest.json"),
      JSON.stringify(manifest),
    );
  save();
  return { directory, manifest, save };
}
test("accepts a complete set only for the expected source commit", (t) => {
  const f = fixture(t);
  assert.equal(
    loadScreenshotSet(f.directory, "a".repeat(40)).screenshots.length,
    screenshotIds.length,
  );
  assert.throws(
    () => loadScreenshotSet(f.directory, "b".repeat(40)),
    /source commit/,
  );
});
test("rejects a partial set and filenames outside the capture directory", (t) => {
  const f = fixture(t);
  f.manifest.screenshots[0].filename = "../private.png";
  f.save();
  assert.throws(() => loadScreenshotSet(f.directory), /filename/);
  f.manifest.screenshots.pop();
  f.save();
  assert.throws(() => loadScreenshotSet(f.directory), /Incomplete/);
});
test("rejects changed image bytes and mismatched dimensions", (t) => {
  const f = fixture(t);
  const image = readFileSync(path.join(f.directory, "scan.png"));
  image[9] = 1;
  writeFileSync(path.join(f.directory, "scan.png"), image);
  assert.throws(() => loadScreenshotSet(f.directory), /checksum/);
  f.manifest.screenshots[0].width = 1280;
  f.save();
  assert.throws(() => loadScreenshotSet(f.directory), /dimensions/);
});
test("missing manifest fails instead of falling back to stale images", (t) => {
  const f = fixture(t);
  rmSync(path.join(f.directory, "manifest.json"));
  assert.throws(() => loadScreenshotSet(f.directory), /missing/);
});
