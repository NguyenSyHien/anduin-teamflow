import test from "node:test";
import assert from "node:assert/strict";
import {
  parseProposal,
  intakeMessages,
  approveStaffing,
  staffingSnapshot,
} from "../dist/intake-core.js";
import { recommend, validateSquad } from "../dist/engine.js";
const valid = {
  roles: [
    {
      role: "Analyst",
      responsibility: "Map source fields",
      reason: "Data mapping is needed",
    },
  ],
};
const project = () => ({
  id: "p",
  roles: ["Analyst"],
  brief: "Map data fields for investor migration",
  start: "2026-12-07",
  end: "2026-12-11",
  level: 2,
  skill: "Reporting",
  effort: { Analyst: 20 },
  requirements: { Analyst: "Map source fields" },
  requiredSkills: {},
  assignments: [],
  staffing: { status: "draft", source: "ai", proposal: structuredClone(valid) },
});
const state = () => ({
  people: [
    {
      id: "u",
      name: "Analyst",
      role: "Analyst",
      level: 2,
      skills: ["Reporting"],
      capacity: 8,
      leave: [],
    },
  ],
  projects: [],
});
test("explicit AI outline headings are parsed, while unrelated mentions are not treated as roles", () => {
  const text =
    "Suggested plan:\n1. Project Manager:\n- Responsibilities:\n- Coordinate the migration and customer approvals.\n2. Engineer:\n- Build migration pipelines.\n3. Other (optional):\n- Security reviewer\nNote: provisional";
  const p = parseProposal(text);
  assert.deepEqual(
    p.roles.map((r) => r.role),
    ["Project manager", "Engineer"],
  );
  assert.equal(p.roles[1].responsibility, "Build migration pipelines.");
  assert.equal(p.rawText, text);
  assert.throws(() => parseProposal("You might ask an Engineer about this."));
  assert.throws(() =>
    parseProposal("1. Analyst:\nDo analysis\n2. Analyst:\nDo analysis again"),
  );
});
test("model output is schema checked, with unknown roles, duplicates and malformed data rejected", () => {
  assert.equal(
    parseProposal("```json\n" + JSON.stringify(valid) + "\n```").roles[0].role,
    "Analyst",
  );
  for (const output of [
    "not JSON",
    "{}",
    '{"roles":[]}',
    JSON.stringify({ roles: [{ ...valid.roles[0], role: "Admin" }] }),
    JSON.stringify({ roles: [valid.roles[0], valid.roles[0]] }),
    JSON.stringify({ roles: [{ role: "QA" }] }),
  ])
    assert.throws(() => parseProposal(output));
});
test("brief is bounded and enclosed as task data", () => {
  assert.throws(() => intakeMessages("short"));
  assert.throws(() => intakeMessages("x".repeat(2001)));
  assert.match(
    intakeMessages("Migrate investor data to a new platform")[1].content,
    /<brief>/,
  );
});
test("a one-role project gets a one-person squad, but draft cannot be allocated", () => {
  const p = project(),
    s = state();
  const rec = recommend(s, p);
  assert.equal(rec.length, 1);
  const a = [{ role: "Analyst", personId: "u", hours: 4 }];
  assert.match(validateSquad(s, p, a), /Approve/);
  approveStaffing(p, "Demo lead", "Confirmed scope");
  assert.equal(validateSquad(s, p, a), null);
  assert.ok(
    validateSquad(s, p, [...a, { role: "QA", personId: "u", hours: 4 }]),
  );
});
test("approval preserves original proposal and records reviewer and exact requirements", () => {
  const p = project();
  approveStaffing(p, "Lead", "Confirmed volume", "2026-11-05T00:00:00Z");
  assert.deepEqual(p.staffing.proposal, valid);
  assert.equal(p.staffing.approval.snapshot, staffingSnapshot(p));
  assert.equal(p.staffing.history[0].reviewer, "Lead");
  p.requirements.Analyst = "Map and reconcile";
  assert.match(
    validateSquad(state(), p, [{ role: "Analyst", personId: "u", hours: 4 }]),
    /changed/,
  );
  approveStaffing(p, "Lead", "Revised");
  assert.equal(p.staffing.history.length, 2);
});
test("approval requires reviewer, roles, positive effort and responsibilities", () => {
  assert.throws(() => approveStaffing(project(), "", ""));
  for (const patch of [
    { roles: [] },
    { effort: { Analyst: null } },
    { effort: { Analyst: NaN } },
    { requirements: { Analyst: "" } },
  ])
    assert.throws(() =>
      approveStaffing({ ...project(), ...patch }, "Lead", ""),
    );
});
test("validating a committed squad excludes its own allocations but still counts other projects", () => {
  const p = project(),
    s = state();
  approveStaffing(p, "Lead", "");
  p.assignments = [{ role: "Analyst", personId: "u", hours: 5 }];
  s.projects = [p];
  assert.equal(validateSquad(s, p, p.assignments), null);
  s.projects.push({
    ...project(),
    id: "other",
    assignments: [{ role: "Analyst", personId: "u", hours: 4 }],
  });
  assert.match(validateSquad(s, p, p.assignments), /capacity conflict/);
});
