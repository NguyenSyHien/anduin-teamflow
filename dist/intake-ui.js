import { roles, projectRoles, days } from "./engine.js";
import { defaultRequirements } from "./semantic-core.js";
import { draftStaffing, cancelIntake } from "./intake-client.js";
import {
  approveStaffing,
  staffingSnapshot,
  reviewQuestions,
} from "./intake-core.js";

export function createIntakeUI({
  $,
  esc,
  modal,
  close,
  getState,
  save,
  squadDialog,
}) {
  const upsert = (p) => {
    const state = getState(),
      index = state.projects.findIndex((x) => x.id === p.id);
    if (index < 0) state.projects.push(structuredClone(p));
    else state.projects[index] = structuredClone(p);
  };
  const list = (items) =>
    `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  function context(p) {
    const proposal = p.staffing?.proposal;
    if (!proposal) return '';
    return `<details class="candidate-details"><summary>${p.staffing.source === "ai" ? "AI notes & questions" : "Planning notes"}</summary>${proposal.roles.map(r=>`<p><b>${esc(r.role)}</b> · ${esc(r.reason)}</p>`).join('')}${proposal.questions?.length?`<h4>Open questions</h4>${list(proposal.questions)}`:''}${proposal.assumptions?.length?`<h4>Assumptions</h4>${list(proposal.assumptions)}`:''}${proposal.rawText?`<p>${esc(proposal.rawText)}</p>`:''}</details>${p.staffing.history?.length?`<details class="candidate-details"><summary>Approval history (${p.staffing.history.length})</summary>${p.staffing.history.map(a=>`<p>${esc(a.reviewer)} · ${esc(a.at)}<br>${esc(a.notes)}</p>`).join('')}</details>`:''}`;
  }
  function review(id, draft) {
    const existing = getState().projects.find((p) => p.id === id);
    const p = structuredClone(draft || existing);
    p.roles ??= [...roles];
    p.requirements ??= { ...defaultRequirements };
    p.requiredSkills ??= {};
    modal(`<div class="dialog-head"><div><span class="tag">Step 2 of 3 · Review</span><h2 id="dialog-title">Review the project</h2><p>Check dates, roles and hours. Then find your squad.</p></div><button data-close aria-label="Close">×</button></div>
    <form id="review-form"><div class="form-grid">
    <details class="field full compact-details"><summary>Customer request</summary><label class="field">Brief<textarea name="brief" maxlength="2000" rows="3">${esc(p.brief || "")}</textarea></label></details>
    <label class="field">Project name<input name="name" required maxlength="100" value="${esc(p.name)}"></label>
    <label class="field">Customer<input name="client" required maxlength="100" value="${esc(p.client)}"></label>
    <label class="field">Start date<input type="date" name="start" required min="2020-01-01" max="2035-12-31" value="${esc(p.start)}"></label>
    <label class="field">Deadline<input type="date" name="end" required min="2020-01-01" max="2035-12-31" value="${esc(p.end)}"></label>
    <label class="field">Domain<select name="skill">${["Onboarding", "Fund operations", "Reporting"].map((x) => `<option ${p.skill === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
    <label class="field">Minimum expertise<select name="level">${[1, 2, 3].map((n) => `<option value="${n}" ${p.level === n ? "selected" : ""}>Level ${n} · ${["", "Developing", "Experienced", "Senior"][n]}</option>`).join("")}</select></label>
    <label class="field full">Priority<select name="priority">${["Low", "Medium", "High"].map((x) => `<option ${p.priority === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
    <div class="field full"><h3>Team roles</h3><p class="muted">One person per role. Uncheck any you don’t need.</p></div>
    ${roles.map((r, i) => `<section class="requirement-group field full"><label class="role-toggle"><input type="checkbox" name="include${i}" ${p.roles.includes(r) ? "checked" : ""}>${r}</label><div data-role-fields="${i}"><label class="field">Total hours<input type="number" name="effort${i}" required min="1" max="5000" step="1" placeholder="Estimate hours" value="${p.effort[r] ?? ""}"></label><label class="field">Main task<textarea name="requirement${i}" required maxlength="600" rows="2">${esc(p.requirements[r] || defaultRequirements[r])}</textarea></label><details class="compact-details"><summary>Required skills (optional)</summary><label class="field">Skills<input name="required${i}" maxlength="220" placeholder="Exact skills, comma separated" value="${esc((p.requiredSkills[r] || []).join(", "))}"></label></details></div></section>`).join("")}
    <label class="field full">Your name<input name="reviewer" maxlength="100" value="${esc(p.staffing?.approval?.reviewer || "")}" placeholder="Production lead"></label>
    <details class="field full compact-details"><summary>Add review notes (optional)</summary><label class="field">Notes<textarea name="notes" maxlength="2000" rows="2">${esc(p.staffing?.approval?.notes || p.staffing?.draftNotes || "")}</textarea></label></details><div class="field full">${context(p)}</div>
    <label class="role-toggle field full"><input type="checkbox" name="confirmed">I confirm this staffing plan.</label>
    </div>${p.assignments.length ? '<p class="muted">Changing this plan clears its current squad.</p>' : ""}<div id="review-error" role="alert"></div><div class="form-actions"><button type="button" data-close>Cancel</button><button type="submit" name="mode" value="save" formnovalidate>Save draft</button><button class="primary" name="mode" value="approve">Approve & find squad →</button></div></form>`);
    roles.forEach((r, i) => {
      const toggle = document.querySelector(`[name="include${i}"]`);
      const sync = () => {
        const group = document.querySelector(`[data-role-fields="${i}"]`);
        group.hidden = !toggle.checked;
        group
          .querySelectorAll("input,textarea")
          .forEach((el) => (el.disabled = !toggle.checked));
      };
      toggle.onchange = sync;
      sync();
    });
    $("#review-form").onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      for (const k of [
        "name",
        "client",
        "brief",
        "start",
        "end",
        "skill",
        "priority",
      ])
        p[k] = f.get(k).trim();
      p.level = +f.get("level");
      p.roles = roles.filter((r, i) => f.has("include" + i));
      roles.forEach((r, i) => {
        if (p.roles.includes(r)) {
          p.effort[r] =
            f.get("effort" + i) === "" ? null : +f.get("effort" + i);
          p.requirements[r] = f.get("requirement" + i).trim();
          p.requiredSkills[r] = [
            ...new Set(
              f
                .get("required" + i)
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean),
            ),
          ];
        }
      });
      try {
        if (!p.name || !p.client)
          throw Error("Enter a project name and customer.");
        const changed = p.staffing?.approval?.snapshot !== staffingSnapshot(p);
        if (e.submitter?.value === "save") {
          if (changed) {
            p.staffing = {
              ...p.staffing,
              status: "draft",
              draftNotes: f.get("notes"),
            };
            p.assignments = [];
            delete p.matching;
          }
          upsert(p);
          save("Saved staffing draft for " + p.name);
          close();
          return;
        }
        if (
          !p.start ||
          !p.end ||
          p.end < p.start ||
          new Date(p.end) - new Date(p.start) > 366 * 86400000 ||
          !days(p.start, p.end).length
        )
          throw Error(
            "Choose a window of up to one year containing working days.",
          );
        if (!f.has("confirmed"))
          throw Error(
            "Confirm that you have reviewed the staffing requirements.",
          );
        approveStaffing(p, f.get("reviewer"), f.get("notes"));
        if (changed) {
          p.assignments = [];
          delete p.matching;
        }
        upsert(p);
        save("Staffing approved by " + f.get("reviewer") + " for " + p.name);
        squadDialog(p);
      } catch (error) {
        $("#review-error").textContent = error.message;
      }
    };
  }
  function openReview(data, proposal, source, model = null) {
    review(null, {
      id: crypto.randomUUID(),
      name: data.name,
      client: data.client,
      brief: data.brief,
      start: "",
      end: "",
      skill: "Fund operations",
      level: 2,
      priority: "Medium",
      roles: proposal.roles.map((r) => r.role),
      effort: {},
      requirements: Object.fromEntries(
        proposal.roles.map((r) => [r.role, r.responsibility]),
      ),
      requiredSkills: {},
      assignments: [],
      staffing: {
        status: "draft",
        source,
        model,
        proposal: structuredClone(proposal),
        originalBrief: data.brief,
        generatedAt: new Date().toISOString(),
        history: [],
      },
    });
  }
  function intake(saved = {}) {
    modal(`<div class="dialog-head"><div><span class="tag">Step 1 of 3 · Project</span><h2 id="dialog-title">New project</h2><p>Describe the work. AI will suggest the roles.</p></div><button data-close aria-label="Close">×</button></div><form id="intake-form">
    <label class="field">Customer request<textarea name="brief" required minlength="20" maxlength="2000" rows="6" placeholder="We need to migrate our investor data into a new platform by December 18.">${esc(saved.brief || "")}</textarea></label>
    <div class="form-grid"><label class="field">Project name<input name="name" required maxlength="100" value="${esc(saved.name || "")}" placeholder="Investor data migration"></label><label class="field">Customer<input name="client" required maxlength="100" value="${esc(saved.client || "")}" placeholder="Atlas Capital"></label></div>
    <p class="muted">AI suggests roles; you approve the plan. Your brief is processed by an LLM.</p><div id="intake-error" role="alert"></div><div class="form-actions"><button type="button" id="manual-intake">Plan manually</button><button class="primary">Suggest roles ✧</button></div></form>`);
    const form = $("#intake-form"),
      read = () => Object.fromEntries(new FormData(form));
    $("#manual-intake").onclick = () => {
      if (form.reportValidity())
        openReview(
          read(),
          {
            roles: roles.map((role) => ({
              role,
              responsibility: defaultRequirements[role],
              reason:
                "Included in manual starting template; remove if unnecessary.",
            })),
            questions: reviewQuestions,
            assumptions: [
              "This is a manual starting template, not an AI recommendation.",
            ],
          },
          "manual",
        );
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = read();
      modal(
        `<div class="dialog-head"><div><span class="tag">AI staffing draft</span><h2 id="dialog-title">Suggesting roles…</h2></div><button data-close aria-label="Close">×</button></div><div class="matching-loader"><span class="spinner"></span><strong id="intake-progress" role="status">Connecting to the staffing assistant…</strong><p>You’ll review the plan next.</p></div><div class="form-actions"><button id="cancel-intake">Back to brief</button></div>`,
      );
      const dialog = $("#modal").firstElementChild;
      $("#cancel-intake").onclick = () => {
        cancelIntake();
        intake(data);
      };
      try {
        const result = await draftStaffing(data.brief, (message) => {
          if (dialog.isConnected) $("#intake-progress").textContent = message;
        });
        if (dialog.isConnected)
          openReview(data, result.proposal, "ai", result.model);
      } catch (error) {
        if (dialog.isConnected) {
          intake(data);
          $("#intake-error").textContent =
            "AI drafting could not finish. " +
            error.message +
            " Retry or plan manually; your brief is preserved.";
        }
      }
    };
  }
  return { intake, review };
}
