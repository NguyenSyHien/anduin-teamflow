import test from "node:test";
import assert from "node:assert/strict";
import {
  cosine,
  profileText,
  requirementText,
  semanticPoints,
  migrateWorkspace,
} from "../dist/semantic-core.js";
import { roles, recommend, validateSquad } from "../dist/engine.js";
const fixture = () => ({
  people: roles.map((role, i) => ({
    id: String(i),
    name: role,
    role,
    level: 2,
    skills: ["Reporting"],
    capabilities: ["SQL"],
    experience: "Data pipelines",
    capacity: 8,
    leave: [],
  })),
  projects: [],
});
const project = () => ({
  id: "p",
  start: "2026-11-02",
  end: "2026-11-06",
  level: 2,
  skill: "Reporting",
  effort: Object.fromEntries(roles.map((r) => [r, 20])),
  requiredSkills: {},
  assignments: [],
});
const scores = (state) =>
  Object.fromEntries(
    roles.map((r) => [
      r,
      Object.fromEntries(state.people.map((p) => [p.id, 0.8])),
    ]),
  );

test("cosine measures direction and rejects malformed embeddings", () => {
  assert.equal(cosine([1, 0], [2, 0]), 1);
  assert.equal(cosine([1, 0], [0, 1]), 0);
  assert.throws(() => cosine([1], [1, 2]));
  assert.throws(() => cosine([0, 0], [1, 2]));
  assert.throws(() => cosine([NaN, 1], [1, 1]));
});
test("relevance changes feasible selection when baseline otherwise prefers a different candidate", () => {
  const s = fixture(),
    p = project();
  s.people.push({
    ...s.people[2],
    id: "alt",
    name: "Other engineer",
    skills: [],
  });
  const sc = scores(s);
  sc.Engineer["2"] = 0.2;
  sc.Engineer.alt = 0.95;
  assert.equal(recommend(s, p)[2].selected, "2");
  assert.equal(recommend(s, p, sc)[2].selected, "alt");
});
test("perfect semantic relevance never bypasses leave or low expertise", () => {
  const s = fixture(),
    p = project(),
    sc = scores(s);
  sc.Engineer["2"] = 1;
  s.people[2].leave.push({ start: p.start, end: p.start });
  assert.equal(recommend(s, p, sc)[2].selected, "");
  s.people[2].leave = [];
  s.people[2].level = 1;
  assert.equal(recommend(s, p, sc)[2].selected, "");
});
test("mandatory skills are case-insensitive and rechecked at apply time", () => {
  const s = fixture(),
    p = project();
  p.requiredSkills.Engineer = ["sql"];
  assert.equal(recommend(s, p, scores(s))[2].selected, "2");
  p.requiredSkills.Engineer = ["Python"];
  assert.equal(recommend(s, p, scores(s))[2].selected, "");
  const a = roles.map((role, i) => ({ role, personId: String(i), hours: 4 }));
  assert.match(validateSquad(s, p, a), /missing required skills/);
});
test("missing ML output fails rather than inventing a similarity", () => {
  assert.throws(
    () => recommend(fixture(), project(), {}),
    /Missing semantic score/,
  );
});
test("ranking score and displayed parts reconcile", () => {
  const r = semanticPoints(0.8, 0.5, true);
  assert.equal(r.parts.relevance, 52);
  assert.equal(r.parts.capacity, 12.5);
  assert.equal(r.parts.domain, 10);
  assert.equal(r.score, 75);
  assert.equal(semanticPoints(-0.8, 1, false).parts.relevance, 0);
});
test("model input excludes names and clients and changes with edited experience", () => {
  const s = fixture(),
    p = project(),
    u = s.people[0];
  u.name = "Private name";
  p.client = "Private customer";
  assert.ok(!profileText(u).includes(u.name));
  assert.ok(!requirementText(p, roles[0]).includes(p.client));
  const before = profileText(u);
  u.experience = "Investor document workflows";
  assert.notEqual(profileText(u), before);
});
test("migration preserves existing work and user-authored profiles", () => {
  const s = fixture();
  s.projects.push(project());
  s.people[0].leave.push({ start: "2026-11-04", end: "2026-11-04" });
  const before = structuredClone(s);
  migrateWorkspace(s);
  assert.deepEqual(s.people[0].leave, before.people[0].leave);
  assert.equal(s.people[0].experience, before.people[0].experience);
  assert.deepEqual(s.projects[0].assignments, []);
  const once = structuredClone(s);
  migrateWorkspace(s);
  assert.deepEqual(s, once);
});
test("NaN allocation and duplicate role cannot bypass validation", () => {
  const s = fixture(),
    p = project(),
    a = roles.map((role, i) => ({ role, personId: String(i), hours: 4 }));
  a[0].hours = NaN;
  assert.match(validateSquad(s, p, a), /valid positive/);
  a[0].hours = 4;
  a[1].role = a[0].role;
  assert.match(validateSquad(s, p, a), /required roles/);
});
