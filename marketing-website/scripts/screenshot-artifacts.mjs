import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export const screenshotIds = ["start", "directions", "plan", "evidence", "dashboard", "scan", "tracker"];
export function loadScreenshotSet(directory, expectedSha) {
  const file = path.join(directory, "manifest.json");
  if (!existsSync(file))
    throw new Error("Fresh screenshot manifest is missing");
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  if (
    manifest.schemaVersion !== 1 ||
    !/^[a-f0-9]{40}$/.test(manifest.sourceSha || "") ||
    !Number.isFinite(Date.parse(manifest.capturedAt))
  )
    throw new Error("Invalid screenshot manifest");
  if (expectedSha && manifest.sourceSha !== expectedSha)
    throw new Error("Screenshots do not match the source commit");
  if (
    !Array.isArray(manifest.screenshots) ||
    manifest.screenshots.length !== screenshotIds.length
  )
    throw new Error("Incomplete screenshot set");
  for (const id of screenshotIds) {
    const entries = manifest.screenshots.filter((shot) => shot.id === id);
    if (entries.length !== 1 || entries[0].filename !== `${id}.png`)
      throw new Error("Invalid screenshot filename or ID");
    const shot = entries[0];
    const image = readFileSync(path.join(directory, shot.filename));
    if (
      image.length < 24 ||
      !image
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      image.toString("ascii", 12, 16) !== "IHDR"
    )
      throw new Error("Screenshot is not a PNG");
    if (
      image.readUInt32BE(16) !== shot.width ||
      image.readUInt32BE(20) !== shot.height ||
      shot.width < 1000 ||
      shot.height < 700
    )
      throw new Error("Unexpected screenshot dimensions");
    if (createHash("sha256").update(image).digest("hex") !== shot.sha256)
      throw new Error("Screenshot checksum mismatch");
  }
  return manifest;
}
