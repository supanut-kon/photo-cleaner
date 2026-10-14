import { test } from "node:test";
import assert from "node:assert/strict";
import { photoFeather } from "../src/photoFeather.ts";

test("portrait photos soften only the edges adjoining side bands", () => {
  const frame = photoFeather(300, 600, 400, 600);
  assert.equal(frame.axis, "horizontal");
  assert.equal(frame.x, 50);
  assert.equal(frame.y, 0);
  assert.equal(frame.width, 300);
  assert.equal(frame.feather, 18);
});
test("landscape photos soften only the edges adjoining top and bottom bands", () => {
  const frame = photoFeather(800, 400, 400, 600);
  assert.equal(frame.axis, "vertical");
  assert.equal(frame.y, 200);
  assert.equal(frame.height, 200);
});
test("photos filling the preview have no edge feather", () => {
  assert.equal(photoFeather(800, 1200, 400, 600).axis, null);
  assert.equal(photoFeather(800, 1200, 0, 0), null);
});
