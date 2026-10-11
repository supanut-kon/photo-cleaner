import { test } from "node:test";
import assert from "node:assert/strict";
import { monthBounds, editableFileUri } from "../src/collectionRules.ts";

test("editing rejects Photos references before invoking the file image manipulator", () => {
  assert.throws(() =>
    editableFileUri("ph://A24D42B1-C521-4510-81A1-0095E315CBCD/L0/001"),
  );
  assert.throws(() => editableFileUri(undefined));
  assert.throws(() => editableFileUri("https://example.com/photo.jpg"));
  assert.equal(
    editableFileUri("file:///cache/photo.heic"),
    "file:///cache/photo.heic",
  );
  assert.equal(
    editableFileUri("content://media/external/images/42"),
    "content://media/external/images/42",
  );
});

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
