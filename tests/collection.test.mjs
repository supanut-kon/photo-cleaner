import { test } from "node:test";
import assert from "node:assert/strict";
import { monthBounds } from "../src/collectionRules.ts";

test("month selection handles leap February and the December year boundary", () => {
  assert.deepEqual(monthBounds("2024-02"), {
    createdAfter: new Date(2024, 1, 1).getTime(),
    createdBefore: new Date(2024, 2, 1).getTime() - 1,
  });
  assert.deepEqual(monthBounds("2026-12"), {
    createdAfter: new Date(2026, 11, 1).getTime(),
    createdBefore: new Date(2027, 0, 1).getTime() - 1,
  });
});
test("malformed months cannot silently select an unintended date range", () => {
  for (const value of [
    "2026-00",
    "2026-13",
    "26-10",
    "2026-1",
    "0000-10",
    "",
    "2026-10-extra",
  ]) {
    assert.throws(() => monthBounds(value));
  }
});
