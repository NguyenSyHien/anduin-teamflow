import { shiftDate, validateWindow, weekRanges, removeMember } from "./workspace.js";
import {
  roles,
  projectRoles,
  days,
  capacity,
  load,
  utilization,
  recommend,
  validateSquad,
} from "./engine.js";
import {
  MODEL_ID,
  migrateWorkspace,
  defaultRequirements,
} from "./semantic-core.js";
import { matchWorkspace, cancelMatching } from "./semantic-client.js";
import { createIntakeUI } from "./intake-ui.js";
import { cancelIntake } from "./intake-client.js";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let base = "2026-11-02",
  end = "2026-11-27";
const seed = () => ({
  people: [
    ["Ava Chen", 0, 3, ["Fund operations", "Onboarding"]],
    ["Noah Williams", 0, 2, ["Reporting"]],
    ["Olivia Park", 1, 3, ["Fund operations", "Reporting"]],
    ["Liam Nguyen", 1, 2, ["Onboarding"]],
    ["Emma Wilson", 2, 3, ["Fund operations", "Onboarding"]],
    ["Ethan Brooks", 2, 2, ["Reporting"]],
    ["Sophia Patel", 3, 3, ["Fund operations"]],
    ["Lucas Martin", 3, 2, ["Onboarding", "Reporting"]],
  ].map(([name, r, level, skills], i) => ({
    id: "u" + i,
    name,
    role: roles[r],
    level,
    skills,
    capacity: 8,
    leave: i === 4 ? [{ start: "2026-11-12", end: "2026-11-13" }] : [],
  })),
  projects: [
    {
      id: "p1",
      name: "Northstar fund onboarding",
      client: "Northstar Capital",
      skill: "Onboarding",
      level: 2,
      start: "2026-11-02",
      end: "2026-11-13",
      priority: "High",
      effort: { "Project manager": 30, Analyst: 50, Engineer: 60, QA: 30 },
      assignments: [
        { role: roles[0], personId: "u0", hours: 3 },
        { role: roles[1], personId: "u3", hours: 5 },
        { role: roles[2], personId: "u4", hours: 6 },
        { role: roles[3], personId: "u7", hours: 3 },
      ],
    },
    {
      id: "p2",
      name: "Investor reporting portal",
      client: "Meridian Partners",
      skill: "Reporting",
      level: 2,
      start: "2026-11-09",
      end: "2026-11-27",
      priority: "Medium",
      effort: { "Project manager": 30, Analyst: 60, Engineer: 90, QA: 60 },
      assignments: [
        { role: roles[0], personId: "u1", hours: 2 },
        { role: roles[1], personId: "u2", hours: 4 },
        { role: roles[2], personId: "u5", hours: 6 },
        { role: roles[3], personId: "u6", hours: 4 },
      ],
    },
    {
      id: "p3",
      name: "Atlas subscription workflow",
      client: "Atlas Ventures",
      skill: "Fund operations",
      level: 2,
      start: "2026-11-16",
      end: "2026-11-27",
      priority: "High",
      effort: { "Project manager": 20, Analyst: 40, Engineer: 60, QA: 30 },
      assignments: [],
    },
    {
      id: "p4",
      name: "Quarter-end data migration",
      client: "Oakridge Investments",
      skill: "Reporting",
      level: 2,
      start: "2026-11-02",
      end: "2026-11-06",
      priority: "Medium",
      effort: { "Project manager": 10, Analyst: 20, Engineer: 25, QA: 15 },
      assignments: [],
    },
  ],
  events: [],
});
let state;
try {
  state = JSON.parse(localStorage.getItem("teamflow-v1")) || seed();
  if (!Array.isArray(state.people) || !Array.isArray(state.projects))
    throw Error();
} catch {
  state = seed();
}
migrateWorkspace(state);
if (state.window && !validateWindow(state.window.start, state.window.end)) { base=state.window.start; end=state.window.end; }
let view = "Overview",
  filter = "",
  statusFilter = "All projects";
function save(message) {
  localStorage.setItem("teamflow-v1", JSON.stringify(state));
  if (message) {
    state.events.unshift({ text: message, time: new Date().toISOString() });
    state.events = state.events.slice(0, 30);
    localStorage.setItem("teamflow-v1", JSON.stringify(state));
    toast(message);
  }
  render();
}
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").style.display = "block";
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(
    () => ($("#toast").style.display = "none"),
    4500,
  );
}
function initials(n) {
  return n
    .split(" ")
    .map((x) => x[0])
    .join("");
}
function fmt(d) {
  if (!d) return "Not confirmed";
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
function conflict(p) {
  return (
    p.assignments.length > 0 && Boolean(validateSquad(state, p, p.assignments))
  );
}
function status(p) {
  return p.staffing?.status === "draft"
    ? "Needs review"
    : p.assignments.length < projectRoles(p).length
      ? "Needs squad"
      : conflict(p)
        ? "At risk"
        : "On track";
}
function badge(p) {
  const s = status(p);
  return `<span class="tag ${s === "At risk" ? "amber" : s === "Needs squad" ? "gray" : ""}">${esc(s)}</span>`;
}
function person(p) {
  return `<div class="person"><span class="avatar">${esc(initials(p.name))}</span><div>${esc(p.name)}<small>${p.role}</small></div></div>`;
}
function stats() {
  const us = state.people.map((p) => utilization(state, p, base, end));
  const used = us.reduce((s, u) => s + u.used, 0),
    cap = us.reduce((s, u) => s + u.cap, 0);
  return {
    pct: cap ? Math.round((used / cap) * 100) : 0,
    free: Math.round(cap - used),
    risk: state.projects.filter(conflict).length,
    pending: state.projects.filter((p) => p.assignments.length < projectRoles(p).length).length,
  };
}
function render() {
  const s = stats();
  $("#app").innerHTML =
    `<div class="shell"><aside class="sidebar"><div class="brand"><span class="mark">≋</span>teamflow<span style="color:#a9bd7d">.</span></div><div class="workspace"><span class="square">A</span><div>Anduin workspace<small style="display:block;color:#8b968d;font-size:10px;margin-top:3px">Production team</small></div><span style="margin-left:auto">⌄</span></div><div class="eyebrow">Workspace</div><nav class="nav">${[
      ["Overview", "▦"],
      ["Matching", "✧"],
      ["Projects", "▱"],
      ["Team", "♧"],
      ["Activity", "◷"],
      ["How it works", "◈"],
    ]
      .map(
        ([v, i]) =>
          `<button data-view="${v}" class="${view === v ? "active" : ""}"><span class="navicon">${i}</span>${v}</button>`,
      )
      .join(
        "",
      )}</nav><div class="sidebar-bottom"><div class="mini-card"><strong>Good work starts with balance.</strong><br><span style="color:#839077">Make room for your team to do their best work.</span></div><div class="profile"><span class="avatar">PL</span><div>Production lead<small style="display:block;color:#909b90;margin-top:3px">Demo workspace</small></div></div></div></aside><main class="main"><header class="topbar"><div>Workspace <span> / &nbsp;${view}</span></div><div><span class="dot"></span> Local demo <span class="hide-mobile">&nbsp; · &nbsp; Changes saved in this browser</span></div></header><div class="content">${view === "Overview" ? overview(s) : view === "Matching" ? matchingPage() : view === "Projects" ? projects() : view === "Team" ? team() : view === "Activity" ? activity() : guide()}<footer class="footer"><span>Teamflow · Thoughtful planning. Better outcomes.</span><span>Planning window · ${esc(base)} – ${esc(end)}</span></footer></div></main></div>`;
  bind();
}
function heading(title, sub, actions = true) {
  return `<div class="page-head"><div><h1>${title}</h1><p>${sub}</p></div>${actions ? '<div class="actions"><button data-action="leave">＋ Add leave</button><button class="primary" data-action="new">＋ New project</button></div>' : ""}</div>`;
}
function overview(s) {
  return `${heading("A little clarity. A lot of possibility.", "Your people, projects, and capacity — all in one place.")}<div class="metrics">${[
    [
      "Active projects",
      state.projects.filter((p) => p.assignments.length).length,
      "▱",
      `${s.pending} projects ready to staff`,
    ],
    [
      "Team utilization",
      `${s.pct}<small>%</small>`,
      "↗",
      "Across your selected planning window",
    ],
    [
      "Available capacity",
      `${s.free}<small> hrs</small>`,
      "◷",
      "Room for what comes next",
    ],
    [
      "Projects at risk",
      s.risk,
      "⚑",
      s.risk
        ? "Capacity conflicts need attention"
        : "All assigned projects look healthy",
    ],
  ]
    .map(
      ([label, value, icon, note], i) =>
        `<div class="metric"><div class="metric-label">${label}<span>${icon}</span></div><div class="metric-value">${value}</div><div class="metric-foot ${i === 3 && s.risk ? "warn" : ""}">${note}</div></div>`,
    )
    .join(
      "",
    )}</div><section class="panel"><div class="panel-heading"><div><h2>Capacity at a glance</h2><div class="sub">See the pressure before it becomes a problem.</div></div><div class="actions"><div class="legend"><span><i></i>Available</span><span><i class="bal"></i>Balanced</span><span><i class="high"></i>Conflict</span></div><button data-action="dates">${esc(base)} – ${esc(end)} ▾</button></div></div><div class="heatmap" style="--weeks:${weekRanges(base,end).length}"><div class="heatrow header"><span>TEAM MEMBER</span>${weekRanges(base,end).map(([a,b])=>`<span>${fmt(a)} – ${fmt(b)}</span>`).join("")}<span>AVG.</span></div>${state.people
    .map(
      (p) =>
        `<div class="heatrow">${person(p)}${weekRanges(base,end)
          .map(([a, b]) => {
            const u = utilization(state, p, a, b);
            return `<div class="cell ${u.conflicts ? "over" : u.percent > 65 ? "busy" : u.percent > 30 ? "medium" : ""}" title="${u.used} booked hours / ${u.cap} available hours; ${u.conflicts} days with conflicts">${u.percent}% ${u.conflicts ? "⚑" : ""}</div>`;
          })
          .join(
            "",
          )}<span style="font-size:11px;color:#809078">${utilization(state, p, base, end).percent}%</span></div>`,
    )
    .join(
      "",
    )}</div><div class="heat-foot"><span>${state.people.length} specialists · ${new Set(state.people.map(p=>p.role)).size} disciplines · Weekdays only</span><span>⚑ Daily capacity conflict</span></div></section><div class="lower"><section class="panel"><div class="panel-heading"><div><h2>Projects in motion</h2><div class="sub">The next great thing starts with the right people.</div></div><button class="link-button" data-view="Projects">View all ↗</button></div>${state.projects
    .slice(0, 4)
    .map(
      (p) =>
        `<div class="project-row"><div class="project-icon">▱</div><div class="project-info"><strong>${esc(p.name)}</strong><p>${esc(p.client)} &nbsp;·&nbsp; Due ${fmt(p.end)}</p></div>${badge(p)}<button class="link-button" data-plan="${p.id}" aria-label="Plan ${esc(p.name)}">↗</button></div>`,
    )
    .join(
      "",
    )}</section><section class="panel"><div class="panel-heading"><div><h2><span style="color:#829e54">✧</span> Planning insights</h2><div class="sub">A heads-up, so you can stay a step ahead.</div></div></div>${state.projects
    .filter(conflict)
    .slice(0, 1)
    .map(
      (p) =>
        `<div class="insight"><span>⚑</span><div><strong>A schedule needs a second look</strong><p>${esc(p.name)} has a daily capacity or leave conflict.</p><button class="link-button" data-plan="${p.id}">Review squad →</button></div></div>`,
    )
    .join(
      "",
    )}<div class="insight green"><span>✧</span><div><strong>${s.pending ? `${s.pending} projects are waiting for their team` : "Your squads are ready"}</strong><p>Match expertise with available capacity. Review every recommendation before applying.</p><button class="link-button" data-action="next">${s.pending ? "Find the right squad" : "Review projects"} →</button></div></div></section></div>`;
}
function projects() {
  const list = state.projects.filter(
    (p) =>
      (p.name + " " + p.client).toLowerCase().includes(filter.toLowerCase()) &&
      (statusFilter === "All projects" || status(p) === statusFilter),
  );
  return `${heading("The work ahead.", "Build the right squad for every customer project.")}<div class="toolbar"><input id="search" aria-label="Search projects" placeholder="Search projects or customers…" value="${esc(filter)}"><select id="status-filter" aria-label="Filter project status">${["All projects", "Needs review", "Needs squad", "On track", "At risk"].map((x) => `<option ${x === statusFilter ? "selected" : ""}>${x}</option>`).join("")}</select></div><section class="panel table-wrap"><table><thead><tr><th>PROJECT / CUSTOMER</th><th>WINDOW</th><th>EXPERTISE</th><th>PRIORITY</th><th>STATUS</th><th></th></tr></thead><tbody>${list.map((p) => `<tr><td><strong>${esc(p.name)}</strong><p>${esc(p.client)}</p></td><td>${fmt(p.start)} – ${fmt(p.end)}</td><td>${p.skill}<p>Level ${p.level}+ · ${projectRoles(p).some(r => !p.effort[r]) ? "Effort pending" : projectRoles(p).reduce((sum,r) => sum + p.effort[r],0) + " hrs"}</p></td><td>${p.priority}</td><td>${badge(p)}</td><td><button data-plan="${p.id}">Plan squad ↗</button></td></tr>`).join("")}</tbody></table>${!list.length ? '<div class="empty">No projects match this view.</div>' : ""}</section>`;
}
function team() {
  return `${heading("People first. Always.", "A shared view of expertise, availability, and the space to do good work.", false)}<div class="toolbar"><button class="primary" data-action="add-member">＋ Add team member</button><button data-action="dates">Planning window: ${esc(base)} – ${esc(end)} ▾</button></div><div class="cards">${state.people
    .map((p) => {
      const u = utilization(state, p, base, end);
      return `<article class="teamcard">${person(p)}<span class="tag gray">${["", "Developing", "Experienced", "Senior"][p.level]} · ${p.capacity}h / day</span><div class="chips">${p.skills.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div><p>${u.used}h booked / ${u.cap}h available</p><div class="bar"><span style="width:${Math.min(100, u.percent)}%"></span></div><p>${u.percent}% utilization ${u.conflicts ? "· " + u.conflicts + " conflict days" : ""}</p>${p.leave.map((l, i) => `<p style="margin-top:10px">Away ${fmt(l.start)} – ${fmt(l.end)} <button class="link-button" data-remove-leave="${p.id}:${i}" aria-label="Remove leave for ${p.name}">Remove</button></p>`).join("")}<p class="profile-experience">${esc(p.experience)}</p><div class="chips">${p.capabilities.map((s) => `<span class="tag gray">${esc(s)}</span>`).join("")}</div><button data-profile="${p.id}">Edit profile</button> <button data-remove-member="${p.id}">Remove member</button> <button style="margin-top:15px" data-person-leave="${p.id}">Manage availability</button></article>`;
    })
    .join("")}${!state.people.length ? '<div class="empty">Your team is empty. Add a specialist to start planning.</div>' : ""}</div><div style="height:24px"></div>`;
}
function activity() {
  return `${heading("Every decision, in view.", "A local history of staffing and availability changes.", false)}<section class="panel">${state.events.length ? state.events.map((e) => `<div class="project-row"><span class="avatar">✓</span><div class="project-info"><strong>${esc(e.text)}</strong><p>${new Date(e.time).toLocaleString()}</p></div></div>`).join("") : '<div class="empty">Your first planning decision will appear here.</div>'}</section><div class="actions" style="margin-bottom:30px"><button data-action="export">Export workspace JSON</button><button data-action="reset">Reset demo data</button></div>`;
}
function bind() {
  document.querySelectorAll("[data-remove-member]").forEach(b=>b.onclick=()=>removeMemberDialog(b.dataset.removeMember));
  document
    .querySelectorAll("[data-profile]")
    .forEach((b) => (b.onclick = () => profileDialog(b.dataset.profile)));
  document.querySelectorAll("[data-view]").forEach(
    (b) =>
      (b.onclick = () => {
        view = b.dataset.view;
        render();
      }),
  );
  document
    .querySelectorAll("[data-action]")
    .forEach((b) => (b.onclick = () => action(b.dataset.action)));
  document
    .querySelectorAll("[data-plan]")
    .forEach((b) => (b.onclick = () => projectDialog(b.dataset.plan)));
  document
    .querySelectorAll("[data-person-leave]")
    .forEach((b) => (b.onclick = () => leaveDialog(b.dataset.personLeave)));
  document.querySelectorAll("[data-remove-leave]").forEach(
    (b) =>
      (b.onclick = () => {
        const [id, i] = b.dataset.removeLeave.split(":");
        const p = state.people.find((p) => p.id === id);
        p.leave.splice(+i, 1);
        save("Removed leave for " + p.name);
      }),
  );
  if ($("#search"))
    $("#search").oninput = (e) => {
      const pos = e.target.selectionStart;
      filter = e.target.value;
      render();
      $("#search").focus();
      $("#search").setSelectionRange(pos, pos);
    };
  if ($("#status-filter"))
    $("#status-filter").onchange = (e) => {
      statusFilter = e.target.value;
      render();
    };
}
let previousFocus;
function modal(html, wide = false) {
  previousFocus = document.activeElement;
  $("#modal").innerHTML =
    `<div class="overlay"><section class="dialog ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="dialog-title">${html}</section></div>`;
  $("#modal")
    .querySelectorAll("[data-close]")
    .forEach((b) => (b.onclick = close));
  $("#modal").querySelector("input,select,textarea,button")?.focus();
}
function close() {
  cancelMatching();
  cancelIntake();
  $("#modal").innerHTML = "";
  previousFocus?.focus();
}
document.addEventListener("keydown", (e) => {
  if (!$("#modal").firstChild) return;
  if (e.key === "Escape") close();
  if (e.key === "Tab") {
    const els = [
      ...$("#modal").querySelectorAll(
        "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary",
      ),
    ].filter((el) => el.getClientRects().length);
    if (e.shiftKey && document.activeElement === els[0]) {
      e.preventDefault();
      els.at(-1).focus();
    } else if (!e.shiftKey && document.activeElement === els.at(-1)) {
      e.preventDefault();
      els[0].focus();
    }
  }
});
function action(a) {
  if (a === "dates") dateDialog();
  if (a === "add-member") profileDialog();
  if (a === "new") intakeUI.intake();
  if (a === "leave") leaveDialog();
  if (a === "next") {
    const p = state.projects.find((p) => p.assignments.length < projectRoles(p).length);
    if (p) projectDialog(p.id);
    else {
      view = "Projects";
      render();
    }
  }
  if (a === "export") {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "teamflow-workspace.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (a === "reset") {
    modal(
      '<div class="dialog-head"><h2 id="dialog-title">Reset this workspace?</h2><button data-close aria-label="Close">×</button></div><p>This replaces your local edits with the original fictional demo data. Export your workspace first if you want to keep it.</p><div class="form-actions"><button data-close>Cancel</button><button class="primary" id="confirm-reset">Reset demo</button></div>',
    );
    $("#confirm-reset").onclick = () => {
      state = migrateWorkspace(seed());
      base="2026-11-02"; end="2026-11-27";
      save("Demo workspace reset");
      close();
    };
  }
}
function projectDialog(id, draft) {
  intakeUI.review(id, draft);
}
function leaveDialog(id) {
  if (!state.people.length) { toast("Add a team member first."); return; }
  modal(
    `<div class="dialog-head"><div><h2 id="dialog-title">Space for time away.</h2><p>Leave immediately updates capacity and flags affected projects.</p></div><button data-close aria-label="Close">×</button></div><form id="leave-form"><div class="form-grid"><label class="field full">Team member<select name="person">${state.people.map((p) => `<option value="${p.id}" ${p.id === id ? "selected" : ""}>${esc(p.name)} · ${p.role}</option>`).join("")}</select></label><label class="field">From<input type="date" name="start" value="${base}" required></label><label class="field">Through<input type="date" name="end" value="${base}" required></label></div><div id="leave-error" role="alert"></div><div class="form-actions"><button type="button" data-close>Cancel</button><button class="primary">Add leave</button></div></form>`,
  );
  $("#leave-form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const start = f.get("start"),
      end = f.get("end");
    if (end < start) {
      $("#leave-error").innerHTML =
        '<p class="notice warning">End date must be on or after the start date.</p>';
      return;
    }
    const person = state.people.find((p) => p.id === f.get("person"));
    person.leave.push({ start, end });
    save(
      "Added leave for " + person.name + " · " + fmt(start) + " – " + fmt(end),
    );
    close();
  };
}
const intakeUI = createIntakeUI({
  $,
  esc,
  modal,
  close,
  getState: () => state,
  save,
  squadDialog,
});
render();

async function squadDialog(p) {
  modal(
    `<div class="dialog-head"><div><span class="tag">Semantic squad matching</span><h2 id="dialog-title">Finding the right expertise.</h2><p>Reading role requirements and specialist experience.</p></div><button data-close aria-label="Close">×</button></div><div class="matching-loader"><span class="spinner"></span><strong id="match-progress" role="status">Starting the language model…</strong><p>The first run downloads a pretrained model (about 23 MB plus runtime). Later runs reuse cached files. Text is processed on your device.</p></div><div class="form-actions"><button id="skip-ml">Use rules instead</button><button id="edit-loading">Edit brief</button></div>`,
  );
  const dialog = $("#modal").firstElementChild;
  $("#skip-ml").onclick = () => {
    cancelMatching();
    showSquad(p, null, "You chose the rules-based baseline.");
  };
  $("#edit-loading").onclick = () => {
    cancelMatching();
    projectDialog(p.id, p);
  };
  try {
    const result = await matchWorkspace(
      state,
      p,
      projectRoles(p),
      (message) => {
        if (dialog.isConnected) $("#match-progress").textContent = message;
      },
    );
    if (dialog.isConnected) showSquad(p, result.scores);
  } catch (error) {
    if (dialog.isConnected)
      showSquad(
        p,
        null,
        "Semantic model unavailable. Rules-based recommendations are shown; retry when your connection and browser allow model loading.",
      );
  }
}

function showSquad(p, scores, fallback = "") {
  let mode = scores ? "semantic" : "baseline";
  let recs;
  const baseline = recommend(state, p);
  function draw() {
    recs = recommend(state, p, mode === "semantic" ? scores : null);
    const count = recs.filter((r) => r.selected).length;
    modal(
      `<div class="dialog-head"><div><span class="tag ${mode === "semantic" ? "" : "gray"}">${mode === "semantic" ? "✧ ML semantic matching · MiniLM" : "Rules-based baseline · no ML"}</span><h2 id="dialog-title">A squad with the right experience.</h2><p>${esc(p.name)} · ${fmt(p.start)} – ${fmt(p.end)}</p></div><button data-close aria-label="Close">×</button></div>
      ${fallback ? `<div class="notice warning">${esc(fallback)} <button class="link-button" id="retry-ml">Retry semantic matching →</button></div>` : ""}
      ${scores ? `<div class="mode-switch"><button id="semantic-mode" class="${mode === "semantic" ? "primary" : ""}">Semantic matching</button><button id="baseline-mode" class="${mode === "baseline" ? "primary" : ""}">Compare rules baseline</button></div>` : ""}
      <div class="notice ${count < recs.length ? "warning" : ""}">${count === recs.length ? `✓ ${count} feasible ${count === 1 ? "specialist" : "specialists"} found.` : `⚑ ${count} of ${recs.length} roles can be staffed. Edit dates, effort, or requirements to resolve the gaps.`} Role, expertise, mandatory skills and daily capacity are enforced in both modes.</div>
      ${recs
        .map(
          (
            r,
            i,
          ) => `<section class="match-role"><div class="match-role-head"><div><h2>${r.role}</h2><p>${r.hours.toFixed(1)}h per working day · Minimum level ${p.level}</p></div><span class="tag ${r.selected ? "" : "amber"}">${r.selected ? "Feasible" : "Unfilled"}</span></div><p class="requirement-copy">${esc(p.requirements?.[r.role] || defaultRequirements[r.role])}</p>
      ${(p.requiredSkills?.[r.role] || []).length ? `<p class="mandatory">Required: ${esc(p.requiredSkills[r.role].join(", "))}</p>` : ""}
      <label class="field">${r.role} specialist<select aria-label="${r.role} specialist" data-role-index="${i}"><option value="">Select a specialist</option>${r.candidates.map((c) => `<option value="${c.personId}" ${c.personId === r.selected ? "selected" : ""} ${!c.feasible ? "disabled" : ""}>${esc(c.name)} · ${c.feasible ? c.score + " pts" : "Unavailable"}</option>`).join("")}</select></label><div id="evidence-${i}"></div>
      <details class="candidate-details"><summary>Compare ${r.candidates.length} candidates · rules pick: ${esc(state.people.find((u) => u.id === baseline[i].selected)?.name || "None feasible")}</summary><div class="table-wrap"><table><thead><tr><th>SPECIALIST</th><th>${mode === "semantic" ? "SIMILARITY" : "DOMAIN"}</th><th>SCORE</th><th>FEASIBILITY</th></tr></thead><tbody>${r.candidates.map((c) => `<tr><td>${esc(c.name)}</td><td>${mode === "semantic" ? c.similarity.toFixed(3) : c.skill ? "Match" : "Adjacent"}</td><td>${c.score}</td><td>${esc(c.reason)}</td></tr>`).join("")}</tbody></table></div></details></section>`,
        )
        .join("")}
      <p class="scoring-note">${mode === "semantic" ? "Score: 65 × positive cosine similarity + 25 × spare-capacity ratio + 10 for domain match. Similarity measures text relevance, not probability of successful delivery. Weights are prototype assumptions." : "Baseline: domain match (40), spare capacity (up to 40), and seniority above the minimum (5 per level)."} One specialist per role; manager approval required.</p><div id="squad-error" role="alert"></div><div class="form-actions"><button id="back-project">Edit brief</button><button class="primary" id="apply-squad">Apply squad →</button></div>`,
      true,
    );
    recs.forEach((r, i) => evidence(r, i));
    document.querySelectorAll("[data-role-index]").forEach(
      (el) =>
        (el.onchange = () => {
          const i = +el.dataset.roleIndex;
          recs[i].selected = el.value;
          evidence(recs[i], i);
        }),
    );
    if ($("#semantic-mode"))
      $("#semantic-mode").onclick = () => {
        mode = "semantic";
        draw();
      };
    if ($("#baseline-mode"))
      $("#baseline-mode").onclick = () => {
        mode = "baseline";
        draw();
      };
    if ($("#retry-ml")) $("#retry-ml").onclick = () => squadDialog(p);
    $("#back-project").onclick = () => projectDialog(p.id, p);
    $("#apply-squad").onclick = () => {
      const assignments = recs
        .filter((r) => r.selected)
        .map((r) => ({ role: r.role, personId: r.selected, hours: r.hours }));
      const error = validateSquad(state, p, assignments);
      if (error) {
        $("#squad-error").innerHTML =
          `<div class="notice warning">${esc(error)}</div>`;
        return;
      }
      p.assignments = assignments;
      p.matching = {
        mode,
        model: mode === "semantic" ? MODEL_ID : null,
        at: new Date().toISOString(),
        selections: recs.map((r) => {
          const c = r.candidates.find((c) => c.personId === r.selected);
          return {
            role: r.role,
            personId: c.personId,
            score: c.score,
            similarity: c.similarity,
            parts: c.parts,
          };
        }),
      };
      const index = state.projects.findIndex((x) => x.id === p.id);
      if (index < 0) state.projects.push(p);
      else state.projects[index] = p;
      save(
        `Applied ${mode === "semantic" ? "ML-assisted" : "rules-based"} squad to ${p.name}`,
      );
      close();
    };
  }
  function evidence(r, i) {
    const c = r.candidates.find((c) => c.personId === r.selected);
    if (!c) {
      $("#evidence-" + i).innerHTML =
        '<p class="evidence">No feasible specialist selected. Review candidate blockers below.</p>';
      return;
    }
    const u = state.people.find((u) => u.id === c.personId);
    $("#evidence-" + i).innerHTML =
      `<div class="evidence"><strong>Why this person is eligible</strong><p>${esc(c.reason)}</p><div class="chips">${u.capabilities.map((s) => `<span class="tag gray">${esc(s)}</span>`).join("")}</div><p><b>Profile evidence:</b> ${esc(u.experience || "No experience description provided.")}</p>${mode === "semantic" ? `<div class="score-parts"><span>Text relevance <b>${c.parts.relevance.toFixed(1)}/65</b></span><span>Spare capacity <b>${c.parts.capacity.toFixed(1)}/25</b></span><span>Domain <b>${c.parts.domain}/10</b></span></div>` : ""}</div>`;
  }
  draw();
}

function dateDialog() {
  modal(`<div class="dialog-head"><div><h2 id="dialog-title">Your planning window</h2><p>Changes the capacity view and totals. Project schedules stay on their own dates.</p></div><button data-close aria-label="Close">×</button></div><form id="dates-form"><div class="form-grid"><label class="field">From<input type="date" name="start" value="${base}" required></label><label class="field">Through<input type="date" name="end" value="${end}" required></label></div><p>Up to one year. Scroll the calendar horizontally for longer windows.</p><div class="actions"><button type="button" id="today-window">Next 4 weeks</button><button type="button" id="demo-window">Demo dates</button></div><p id="dates-error" role="alert"></p><div class="form-actions"><button type="button" data-close>Cancel</button><button class="primary">Apply dates</button></div></form>`);
  const form=$("#dates-form");
  const set=(a,b)=>{form.elements.start.value=a;form.elements.end.value=b;};
  $("#today-window").onclick=()=>{const d=new Date();const today=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;set(today,shiftDate(today,27));};
  $("#demo-window").onclick=()=>set("2026-11-02","2026-11-27");
  form.onsubmit=e=>{e.preventDefault();const a=form.elements.start.value,b=form.elements.end.value;const error=validateWindow(a,b);if(error){$("#dates-error").textContent=error;return;}base=a;end=b;state.window={start:a,end:b};save();close();};
}
function removeMemberDialog(id) {
  const p=state.people.find(p=>p.id===id);
  const affected=state.projects.filter(p=>p.assignments.some(a=>a.personId===id));
  modal(`<div class="dialog-head"><h2 id="dialog-title">Remove ${esc(p.name)}?</h2><button data-close aria-label="Close">×</button></div><p>This removes their profile and leave. Their assignments will be removed from ${affected.length} project(s); other squad members remain assigned. Affected projects will need a replacement.</p>${affected.map(p=>`<p>• ${esc(p.name)}</p>`).join('')}<div class="form-actions"><button data-close>Cancel</button><button id="confirm-remove">Remove member</button></div>`);
  $("#confirm-remove").onclick=()=>{removeMember(state,id);save(`Removed ${p.name}; ${affected.length} projects need replanning`);close();};
}
function profileDialog(id) {
  const existing=state.people.find(p=>p.id===id);
  const p=existing || {name:"",role:roles[0],level:2,capacity:8,skills:[],capabilities:[],experience:"",leave:[]};
  modal(`<div class="dialog-head"><div><h2 id="dialog-title">${existing?'Edit team profile':'Add team member'}</h2><p>Skills and experience inform matching. Availability is checked each day.</p></div><button data-close aria-label="Close">×</button></div><form id="profile-form"><div class="form-grid"><label class="field">Full name<input name="name" maxlength="80" required value="${esc(p.name)}"></label><label class="field">Role<select name="role">${roles.map(r=>`<option ${r===p.role?'selected':''}>${r}</option>`).join('')}</select></label><label class="field full">Domains (comma separated)<input name="skills" maxlength="220" value="${esc(p.skills.join(', '))}" placeholder="Fund operations, Reporting, Onboarding"></label><label class="field full">Skills (comma separated)<input name="capabilities" maxlength="220" value="${esc(p.capabilities.join(', '))}" placeholder="Python, APIs, Document processing"></label><label class="field full">Relevant experience<textarea name="experience" maxlength="600" rows="4" required>${esc(p.experience)}</textarea></label><label class="field">Expertise level<select name="level">${[1,2,3].map(n=>`<option value="${n}" ${n===p.level?'selected':''}>Level ${n} · ${['','Developing','Experienced','Senior'][n]}</option>`).join('')}</select></label><label class="field">Daily capacity (hours)<input name="capacity" type="number" required min="0" max="12" step="0.5" value="${p.capacity}"></label></div><p>Profile changes recheck existing squads. Changing a role can flag assignments for review.</p><div class="form-actions"><button type="button" data-close>Cancel</button><button class="primary">${existing?'Save profile':'Add member'}</button></div></form>`);
  $("#profile-form").onsubmit=e=>{
    e.preventDefault(); const f=new FormData(e.target);
    const name=f.get('name').trim(),experience=f.get('experience').trim();if(!name||!experience)return;
    Object.assign(p,{name,experience,role:f.get('role'),level:+f.get('level'),capacity:+f.get('capacity'),skills:splitSkills(f.get('skills')),capabilities:splitSkills(f.get('capabilities'))});
    if(!existing){p.id=crypto.randomUUID();state.people.push(p);}
    save(`${existing?'Updated':'Added'} team member ${p.name}`);close();
  };
}

function splitSkills(text) {
  return [
    ...new Set(
      text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

function matchingPage() {
  return `${heading("Expertise meets opportunity.", "Real semantic matching, with capacity checks you can trust.", false)}<section class="panel" style="margin-bottom:24px"><div class="panel-heading"><div><span class="tag">New · AI project intake</span><h2>From customer brief to approved requirements.</h2><p>Draft roles with AI, refine the scope, then approve before choosing people.</p></div><button class="primary" data-action="new">Start with a brief →</button></div></section><section class="semantic-hero"><div><span class="tag">✧ Core capability · pretrained MiniLM</span><h2>Match the work to the experience.</h2><p>Describe what each role needs to deliver. Teamflow compares those requirements with specialist profiles, then checks qualifications and every working day.</p><button class="primary" data-plan="${state.projects.find((p) => p.id === "p3")?.id || state.projects[0]?.id || ""}">Try semantic squad matching →</button></div><div class="match-flow"><span>01 &nbsp; Understand requirements</span><span>02 &nbsp; Compare skills & experience</span><span>03 &nbsp; Enforce daily capacity</span><span>04 &nbsp; Review, compare, approve</span></div></section><div class="cards"><section class="step"><h2>Meaning beyond keywords</h2><p>A pretrained sentence model compares descriptions, so “extract investor information” can relate to “document processing.” No model training or API key is needed.</p></section><section class="step"><h2>Evidence you can inspect</h2><p>See profile text, declared skills, capacity and the score breakdown. Compare the ML ranking with the original rules on the same project.</p></section><section class="step"><h2>Capacity stays mandatory</h2><p>A high similarity cannot bypass role, expertise, mandatory skills, or leave. Infeasible candidates stay visible with a reason and cannot be selected.</p></section></div><section class="panel" style="margin-top:24px"><div class="panel-heading"><div><h2>Get the inputs right</h2><p>Edit experience in Team, then add specific requirements and optional mandatory skills in a project brief. Names and customer identifiers are excluded from model input.</p></div><button data-view="Team">Edit team profiles →</button></div></section><p class="scoring-note">Runs on your device in a background worker. First use downloads model files from Hugging Face and the runtime from jsDelivr; profile text is not sent for inference. If loading fails, the app labels its rules-based fallback. A relevance score is not a performance prediction.</p><div style="height:25px"></div>`;
}

function guide() {
  const journey = [
    ["Create project", "Enter the customer brief, project name and customer."],
    ["Review AI draft", "Inspect suggested roles, responsibilities, reasons and scope questions."],
    ["Approve requirements", "Edit roles and skills. Confirm dates, effort and expertise as production lead."],
    ["Compare candidates", "Inspect relevance, profile evidence, availability and any staffing gaps."],
    ["Apply squad", "Choose specialists and confirm assignments. Constraints are checked again."],
    ["Monitor & replan", "Review capacity conflicts when plans or leave change, then revise the plan."]
  ];
  const layers = [
    ["Staffing proposal", "LLM", "Customer brief", "Generate roles, responsibilities and reasons. Surface missing information and assumptions.", "Validate the structured response and supported role types.", "Proposed requirements"],
    ["Human approval", "Production lead", "Proposed requirements", "Edit the roles, mandatory skills, minimum expertise and effort. Confirm dates and scope.", "Record the approval snapshot. Changed requirements need reapproval.", "Approved requirements"],
    ["Squad matching", "Semantic ML + rules", "Approved requirements + profiles + workload + leave", "MiniLM compares requirements with experience. Rank by relevance, spare capacity and domain fit.", "Enforce role, expertise, mandatory skills and capacity on every working day.", "Ranked candidates with feasibility reasons"]
  ];
  return `${heading("How Teamflow works.", "A clear user journey, supported by three decision layers.", false)}
  <section class="guide-section"><div class="guide-section-head"><span class="tag">User workflow</span><h2>From customer request to assigned squad.</h2><p>The production lead stays in control from intake through replanning.</p></div>
  <ol class="guide-journey">${journey.map(([title,body],i)=>`<li><span class="guide-number">${i+1}</span><h3>${title}</h3><p>${body}</p></li>`).join("")}</ol>
  <div class="guide-loop">↺ Requirements or availability changed? Review the affected plan, confirm any revised requirements, and match again.</div></section>
  <section class="guide-section"><div class="guide-section-head"><span class="tag">System architecture</span><h2>How data becomes a decision.</h2><p>Each layer has a distinct job, an explicit input and a reviewable output.</p></div>
  <div class="guide-layers">${layers.map(([title,type,input,process,control,output],i)=>`<article class="guide-layer guide-layer-${i+1}"><header><span class="tag">Layer ${i+1}</span><h3>${title}</h3><p>${type}</p></header><dl><dt>Input</dt><dd>${input}</dd><dt>Process</dt><dd>${process}</dd><dt>Control</dt><dd>${control}</dd><dt>Output</dt><dd class="guide-output">${output}</dd></dl></article>`).join("")}</div>
  <div class="guide-commit">Final lead selection <span>→</span> Recheck constraints <span>→</span> Commit assignments</div></section>
  <section class="guide-section"><div class="guide-section-head"><span class="tag">Reliability by design</span><h2>Checks you can inspect.</h2></div><div class="guide-assurances"><article><h3>Structured validation</h3><p>Malformed drafts are rejected. A failed AI request preserves the brief and offers manual planning.</p></article><article><h3>Human checkpoints</h3><p>Approving staffing requirements and applying a squad are separate decisions. AI does not assign people automatically.</p></article><article><h3>Hard capacity checks</h3><p>A high semantic score cannot override missing skills, insufficient expertise or a daily capacity conflict.</p></article><article><h3>Visible reasons</h3><p>Review profile evidence, ranking components, blocked candidates and the saved approval history.</p></article></div></section>
  <details class="panel guide-details"><summary>Matching logic and prototype boundaries</summary><p>Semantic score = 65 × positive cosine similarity + 25 × average spare-capacity ratio + 10 for domain match. These are prototype weights, not probabilities of successful delivery. Candidates must pass hard constraints before they can be selected.</p><p>MiniLM creates 384-dimensional embeddings in the browser. If the model cannot run, a clearly labeled rules baseline is available. The LLM processes the brief on the server; specialist profiles are processed locally for matching.</p><p>This prototype uses browser-local workspace records, self-reported approval names, even effort per working day and one specialist per selected role. Approval history is not tamper-proof. The overview supports a saved, adjustable date window; recommendations check the full project window. AI suggestions require lead review, and plans are never automatically reassigned.</p></details><div style="height:24px"></div>`;
}
