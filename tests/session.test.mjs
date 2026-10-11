import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptySession,
  decide,
  undo,
  clearQueue,
  restoreSession,
} from "../src/session.ts";

test("confirmed removal only clears the reviewed snapshot", () => {
  const state = decide(
    decide(decide(emptySession(), "phone:a", "trash"), "phone:b", "trash"),
    "phone:c",
    "keep",
  );
  const result = clearQueue(state, ["phone:a", "phone:c", "unknown"]);
  assert.deepEqual(result.removed, ["phone:a"]);
  assert.deepEqual(result.decisions, { "phone:b": "trash", "phone:c": "keep" });
});

test("phone progress survives paging and preserves the Photos copy ID", () => {
  const state = decide(emptySession(), "phone:outside-current-page", "keep");
  state.edits["phone:deleted-original"] = {
    uri: "file:///copy.jpg",
    width: 2048,
    height: 2048,
    savedAt: "2026-10-11",
    libraryAssetId: "saved-copy",
    filename: "keep-copy.jpg",
  };
  assert.deepEqual(restoreSession(JSON.stringify(state)), state);
});

test("undo returns a reviewed photo to the pending deck", () => {
  let state = decide(decide(emptySession(), "a", "keep"), "b", "trash");
  state = undo(state);
  assert.deepEqual(state.decisions, { a: "keep" });
  assert.deepEqual(state.history, ["a"]);
});
test("queue removal does not allow undo to resurrect removed photos", () => {
  const state = clearQueue(
    decide(decide(emptySession(), "a", "trash"), "b", "keep"),
  );
  assert.deepEqual(state.removed, ["a"]);
  assert.deepEqual(undo(state).decisions, {});
  assert.deepEqual(undo(state).removed, ["a"]);
  assert.equal(decide(state, "a", "keep"), state);
});
test("keeping a queued photo removes it from the queue without duplicate history", () => {
  const state = decide(decide(emptySession(), "a", "trash"), "a", "keep");
  assert.deepEqual(state.history, ["a"]);
  assert.deepEqual(clearQueue(state).removed, []);
});
test("restoring rejects corrupt data, unknown assets and contradictory state", () => {
  assert.deepEqual(restoreSession("broken", ["a"]), emptySession());
  assert.deepEqual(restoreSession("null", ["a"]), emptySession());
  const state = restoreSession(
    JSON.stringify({
      decisions: { a: "trash", b: "keep", z: "keep" },
      removed: ["a", "a", "z"],
      history: ["a", "b", "b", "z"],
      edits: {
        b: {
          uri: "https://untrusted.invalid",
          width: 2,
          height: 2,
          savedAt: "",
        },
      },
    }),
    ["a", "b"],
  );
  assert.deepEqual(state, {
    decisions: { b: "keep" },
    removed: ["a"],
    history: ["b"],
    edits: {},
  });
});
test("valid progress and saved copies survive a storage round trip", () => {
  const state = decide(emptySession(), "a", "keep");
  state.edits.a = {
    uri: "file:///copy.jpg",
    width: 800,
    height: 1200,
    savedAt: "2026-10-11",
  };
  assert.deepEqual(restoreSession(JSON.stringify(state), ["a"]), state);
});
