import { test } from "node:test";
import assert from "node:assert/strict";
import { localPhotoBytes, loadPhotoSizes, loadPhotoSizeBatch, summarizePhotoSizes } from "../src/photoSizes.ts";

test("iPhone Photos references use their resolved local file for byte size", () => {
  const calls = [];
  const read = (uri) => { calls.push(uri); return 1827557; };
  assert.equal(localPhotoBytes({uri: "ph://42", localUri: "file:///Photos/IMG_42.HEIC"}, read), 1827557);
  assert.deepEqual(calls, ["file:///Photos/IMG_42.HEIC"]);
  assert.equal(localPhotoBytes({uri: "ph://cloud-only"}, read), 0);
  assert.equal(calls.length, 1);
  assert.equal(localPhotoBytes({uri: "content://media/42"}, read), 1827557);
  assert.equal(localPhotoBytes({uri: "file:///missing"}, () => { throw Error("missing"); }), 0);
  for (const size of [0, -1, NaN, Infinity]) {
    assert.equal(localPhotoBytes({uri: "file:///photo"}, () => size), 0);
  }
});

test("background size lookup is bounded and continues after inaccessible photos", async () => {
  const photos = Array.from({length: 8}, (_, i) => ({id: String(i), assetId: String(i), bytes: 0}));
  photos.push({id: "known", assetId: "known", bytes: 900});
  let active = 0, maximum = 0;
  const updates = new Map();
  await loadPhotoSizes(photos, async (photo) => {
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setImmediate(resolve));
    active--;
    if (photo.id === "2") throw Error("access changed");
    return photo.id === "3" ? 0 : 1200;
  }, (id, size) => updates.set(id, size), () => true);
  assert.equal(maximum, 3);
  assert.equal(updates.size, 6);
  assert.equal(updates.has("known"), false);
  assert.equal(updates.get("7"), 1200);
});

test("switching albums prevents in-flight size results from updating the new collection", async () => {
  let active = true;
  let finish;
  const updates = [];
  const pending = loadPhotoSizes([{id: "old", assetId: "old", bytes: 0}],
    () => new Promise(resolve => { finish = resolve; }),
    (...update) => updates.push(update), () => active);
  active = false;
  finish(2500);
  await pending;
  assert.deepEqual(updates, []);
});

test("queue totals track unknown sizes instead of treating a partial sum as complete", () => {
  assert.deepEqual(summarizePhotoSizes([{bytes: 1200}, {bytes: 0}, {bytes: 800}]), {bytes: 2000, unknown: 1});
  assert.deepEqual(summarizePhotoSizes([{bytes: 0}, {bytes: NaN}]), {bytes: 0, unknown: 2});
});

test("a page publishes sizes once after all lookups, including partial failures", async () => {
  const photos = Array.from({ length: 40 }, (_, i) => ({ id: String(i), assetId: String(i), bytes: 0 }));
  const batches = [];
  let completed = 0;
  await loadPhotoSizeBatch(photos, async (photo) => {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(batches.length, 0);
    completed++;
    if (photo.id === "3") throw Error("unavailable");
    return photo.id === "4" ? 0 : 1200;
  }, sizes => {
    assert.equal(completed, 40);
    batches.push(new Map(sizes));
  }, () => true);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].size, 38);
  assert.equal(batches[0].get("39"), 1200);
});

test("switching albums discards an accumulated size batch before publication", async () => {
  const photos = ["fast", "slow"].map(id => ({ id, assetId: id, bytes: 0 }));
  let active = true;
  let finish;
  const batches = [];
  const pending = loadPhotoSizeBatch(photos, photo => photo.id === "fast"
    ? Promise.resolve(1000) : new Promise(resolve => { finish = resolve; }),
  sizes => batches.push(sizes), () => active);
  await new Promise(resolve => setImmediate(resolve));
  active = false;
  finish(2000);
  await pending;
  assert.deepEqual(batches, []);
});
