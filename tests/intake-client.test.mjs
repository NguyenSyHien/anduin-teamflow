import test from "node:test";
import assert from "node:assert/strict";
import { draftStaffing, cancelIntake } from "../dist/intake-client.js";
test("cancelled or stale intake requests cannot replace the current proposal", async () => {
  const original = globalThis.Worker;
  const workers = [];
  globalThis.Worker = class {
    constructor() {
      workers.push(this);
    }
    postMessage(data) {
      this.data = data;
    }
    terminate() {
      this.stopped = true;
    }
  };
  try {
    const first = draftStaffing("first", () => {});
    const rejected = assert.rejects(first, /Cancelled/);
    const second = draftStaffing("second", () => {});
    await rejected;
    assert.ok(workers[0].stopped);
    workers[0].onmessage({
      data: { id: workers[0].data.id, type: "result", proposal: { bad: true } },
    });
    workers[1].onmessage({
      data: {
        id: workers[1].data.id,
        type: "result",
        proposal: { good: true },
      },
    });
    assert.deepEqual((await second).proposal, { good: true });
    const failed = draftStaffing("third", () => {});
    const failure = assert.rejects(failed, /model failed/);
    workers[2].onmessage({
      data: { id: workers[2].data.id, type: "error", message: "model failed" },
    });
    await failure;
  } finally {
    cancelIntake();
    globalThis.Worker = original;
  }
});
