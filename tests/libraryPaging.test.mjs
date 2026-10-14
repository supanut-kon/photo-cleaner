import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldLoadFromPull } from "../src/libraryPaging.ts";

test("ordinary scrolling toward the bottom cannot fetch another batch", () => {
  assert.equal(shouldLoadFromPull(false, -500), false);
});

test("pulling upward at the bottom requires a deliberate distance", () => {
  assert.equal(shouldLoadFromPull(true, -20), false);
  assert.equal(shouldLoadFromPull(true, -63), false);
  assert.equal(shouldLoadFromPull(true, -64), true);
  assert.equal(shouldLoadFromPull(true, -100), true);
});

test("pulling down or reversing the pull does not fetch another batch", () => {
  assert.equal(shouldLoadFromPull(true, 100), false);
  assert.equal(shouldLoadFromPull(true, 0), false);
  assert.equal(shouldLoadFromPull(true, -10), false);
});
