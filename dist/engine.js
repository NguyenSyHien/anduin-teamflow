import { missingSkills, semanticPoints } from "./semantic-core.js";
import { staffingSnapshot } from "./intake-core.js";
export const roles = ["Project manager", "Analyst", "Engineer", "QA"];
export function projectRoles(project) {
  return project.roles ?? roles;
}

export function days(start, end) {
  const result = [];
  for (
    let d = new Date(start + "T12:00:00Z");
    d <= new Date(end + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6)
      result.push(d.toISOString().slice(0, 10));
    if (result.length > 730) break;
  }
  return result;
}
export function capacity(person, date) {
  return person.leave.some((l) => date >= l.start && date <= l.end)
    ? 0
    : person.capacity;
}
export function load(state, id, date, exclude) {
  return state.projects
    .filter((p) => p.id !== exclude && date >= p.start && date <= p.end)
    .reduce(
      (sum, p) =>
        sum +
        p.assignments
          .filter((a) => a.personId === id)
          .reduce((s, a) => s + a.hours, 0),
      0,
    );
}
export function utilization(state, person, start, end) {
  const dates = days(start, end);
  const cap = dates.reduce((s, d) => s + capacity(person, d), 0);
  const used = dates.reduce((s, d) => s + load(state, person.id, d), 0);
  return {
    cap,
    used,
    percent: cap ? Math.round((100 * used) / cap) : used ? 100 : 0,
    conflicts: dates.filter(
      (d) => load(state, person.id, d) > capacity(person, d),
    ).length,
  };
}
// Semantic scores change ranking only; hard constraints are checked independently.
export function recommend(state, project, semanticScores = null) {
  const dates = days(project.start, project.end);
  return projectRoles(project).map((role) => {
    const hours = project.effort[role] / (dates.length || 1);
    const candidates = state.people
      .filter((p) => p.role === role)
      .map((p) => {
        const skill = p.skills.includes(project.skill);
        const spare = dates.map(
          (d) => capacity(p, d) - load(state, p.id, d, project.id),
        );
        const available = dates.length ? Math.max(0, Math.min(...spare)) : 0;
        const avg = spare.reduce((a, b) => a + b, 0) / (dates.length || 1);
        const missing = missingSkills(p, project, role);
        const blockers = [];
        if (p.level < project.level)
          blockers.push(`Needs expertise level ${project.level}+`);
        if (missing.length)
          blockers.push("Missing required skills: " + missing.join(", "));
        if (!dates.length) blockers.push("No working days in this window");
        if (!Number.isFinite(hours) || hours <= 0)
          blockers.push("Invalid effort");
        if (available + 0.001 < hours)
          blockers.push("Insufficient daily capacity or leave conflict");
        const feasible = blockers.length === 0;
        const baseline = Math.round(
          (skill ? 40 : 0) +
            Math.min(40, (avg / p.capacity) * 40) +
            (p.level - project.level) * 5,
        );
        const similarity = semanticScores ? semanticScores[role]?.[p.id] : null;
        const ranked = semanticScores
          ? semanticPoints(similarity, avg / p.capacity, skill)
          : null;
        return {
          personId: p.id,
          name: p.name,
          skill,
          feasible,
          available,
          hours,
          similarity,
          parts: ranked?.parts,
          baseline,
          score: ranked?.score ?? baseline,
          blockers,
          reason: blockers.length
            ? blockers.join(" · ")
            : `Level ${p.level} meets requirement · ${available.toFixed(1)}h minimum spare/day${skill ? " · Domain match" : ""}`,
        };
      })
      .sort(
        (a, b) =>
          Number(b.feasible) - Number(a.feasible) ||
          b.score - a.score ||
          a.name.localeCompare(b.name),
      );
    return {
      role,
      hours,
      candidates,
      selected: candidates.find((c) => c.feasible)?.personId || "",
    };
  });
}
export function validateSquad(state, project, assignments) {
  const needed = projectRoles(project);
  if (
    !needed.length ||
    needed.some((r) => !roles.includes(r)) ||
    new Set(needed).size !== needed.length
  )
    return "Choose at least one supported role without duplicates.";
  if (project.staffing && project.staffing.status !== "approved")
    return "Approve staffing requirements before assigning people.";
  if (
    project.staffing?.approval &&
    project.staffing.approval.snapshot !== staffingSnapshot(project)
  )
    return "Requirements changed. Ask the production lead to approve them again.";
  const dates = days(project.start, project.end);
  if (!dates.length) return "Choose a window containing working days.";
  if (
    assignments.length !== needed.length ||
    new Set(assignments.map((a) => a.role)).size !== needed.length
  )
    return "Assign all required roles before applying.";
  for (const role of needed) {
    const a = assignments.find((a) => a.role === role);
    const p = state.people.find((p) => p.id === a?.personId);
    if (!p || p.role !== role || p.level < project.level)
      return "Every role needs a specialist at the required level.";
    if (missingSkills(p, project, role).length)
      return p.name + " is missing required skills.";
    if (
      !Number.isFinite(a.hours) ||
      a.hours <= 0 ||
      !Number.isFinite(project.effort[role]) ||
      project.effort[role] <= 0
    )
      return "Enter valid positive effort and allocation hours.";
    if (a.hours + 0.001 < project.effort[role] / dates.length)
      return "Allocation does not cover project effort.";
    if (
      dates.some(
        (d) =>
          load(state, p.id, d, project.id) + a.hours > capacity(p, d) + 0.001,
      )
    )
      return p.name + " has a capacity conflict. Adjust the window or squad.";
  }
  return null;
}
