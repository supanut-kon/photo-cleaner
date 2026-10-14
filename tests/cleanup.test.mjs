import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesCleanup, cleanupProgress } from "../src/cleanup.ts";

const photo = (id, bytes = 0, extra = {}) => ({ id, bytes, filename: "IMG_001.jpg", ...extra });
test("screenshots use native metadata before filename heuristics", () => {
  assert.equal(matchesCleanup(photo("a", 0, { isScreenshot: true }), "screenshots"), true);
  assert.equal(matchesCleanup(photo("a", 0, { isScreenshot: false, filename: "Screenshot_01.png" }), "screenshots"), false);
});
test("Android screenshot names and folders are detected without guessing dimensions", () => {
  assert.equal(matchesCleanup(photo("a", 0, { filename: "Screenshot_20261013.png" }), "screenshots"), true);
  assert.equal(matchesCleanup(photo("a", 0, { source: { uri: "file:///Pictures/Screenshots/001.png" } }), "screenshots"), true);
  assert.equal(matchesCleanup(photo("a", 0, { width: 1170, height: 2532 }), "screenshots"), false);
});
test("large photo threshold excludes unavailable and invalid sizes", () => {
  for (const bytes of [0, NaN, Infinity, -1, 999999]) assert.equal(matchesCleanup(photo("a", bytes), "large"), false);
  assert.equal(matchesCleanup(photo("a", 1000000), "large"), true);
});
test("filtered progress excludes removed photos and preserves shared decisions and order", () => {
  const photos = [photo("a", 2000000), photo("b", 1), photo("c", 1000000), photo("d", 3000000)];
  const decisions = { a: "keep", b: "trash" };
  const result = cleanupProgress(photos, "large", decisions, ["d"]);
  assert.deepEqual(result.matching.map(p => p.id), ["a", "c"]);
  assert.deepEqual(result.pending.map(p => p.id), ["c"]);
  assert.equal(result.reviewed, 1);
  assert.deepEqual(decisions, { a: "keep", b: "trash" });
  assert.equal(photos.length, 4);
});
