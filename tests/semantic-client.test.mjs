import test from "node:test";
import assert from "node:assert/strict";
import { matchWorkspace, cancelMatching } from "../dist/semantic-client.js";

test("worker failure, cancellation and stale messages do not fabricate matching results", async () => {
  const original = globalThis.Worker;
  const workers = [];
  globalThis.Worker = class {
    constructor() {
      workers.push(this);
    }
    postMessage(data) {
      this.request = data;
    }
    terminate() {
      this.terminated = true;
    }
  };
  const state = {
    people: [
      {
        id: "u",
        role: "Engineer",
        skills: [],
        capabilities: [],
        experience: "APIs",
      },
    ],
  };
  const p = { skill: "Reporting", requirements: { Engineer: "Data APIs" } };
  try {
    const first = matchWorkspace(state, p, ["Engineer"], () => {});
    const firstRejected = assert.rejects(first, /cancelled/);
    const staleWorker = workers[0];
    cancelMatching();
    await firstRejected;
    assert.equal(staleWorker.terminated, true);
    const progress = [];
    const next = matchWorkspace(state, p, ["Engineer"], (text) =>
      progress.push(text),
    );
    const w = workers[1],
      id = w.request.id;
    staleWorker.onmessage({
      data: { id: staleWorker.request.id, type: "result", scores: { fake: 1 } },
    });
    w.onmessage({ data: { id, type: "progress", message: "Matching" } });
    w.onmessage({
      data: { id, type: "result", scores: { Engineer: { u: 0.7 } } },
    });
    assert.deepEqual((await next).scores, { Engineer: { u: 0.7 } });
    assert.deepEqual(progress, ["Matching"]);
    const failure = matchWorkspace(state, p, ["Engineer"], () => {});
    const rejected = assert.rejects(failure, /unavailable/);
    w.onerror();
    await rejected;
    assert.equal(w.terminated, true);
  } finally {
    cancelMatching();
    globalThis.Worker = original;
  }
});
