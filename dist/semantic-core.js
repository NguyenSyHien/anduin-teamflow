export const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
export const MODEL_VERSION = "minilm-q8-v1";
export const WEIGHTS = { relevance: 65, capacity: 25, domain: 10 };

export function cosine(a, b) {
  if (!a?.length || a.length !== b?.length)
    throw new Error("Invalid embedding dimensions");
  let dot = 0,
    aa = 0,
    bb = 0;
  for (let i = 0; i < a.length; i++) {
    if (!Number.isFinite(a[i]) || !Number.isFinite(b[i]))
      throw new Error("Invalid embedding values");
    dot += a[i] * b[i];
    aa += a[i] ** 2;
    bb += b[i] ** 2;
  }
  if (!aa || !bb) throw new Error("Empty embedding");
  return Math.max(-1, Math.min(1, dot / Math.sqrt(aa * bb)));
}

export function profileText(person) {
  return `${person.role}. Skills: ${(person.capabilities || []).join(", ")}. Experience: ${person.experience || ""}. Domains: ${person.skills.join(", ")}.`;
}

export function requirementText(project, role) {
  return `${role}. Work: ${project.requirements?.[role] || ""}. Required skills: ${(project.requiredSkills?.[role] || []).join(", ")}. Domain: ${project.skill}.`;
}

export function missingSkills(person, project, role) {
  const owned = new Set(
    [...person.skills, ...(person.capabilities || [])].map((s) =>
      s.trim().toLowerCase(),
    ),
  );
  return (project.requiredSkills?.[role] || []).filter(
    (s) => !owned.has(s.trim().toLowerCase()),
  );
}

export function semanticPoints(similarity, spareRatio, domainMatch) {
  if (!Number.isFinite(similarity)) throw new Error("Missing semantic score");
  const parts = {
    relevance: WEIGHTS.relevance * Math.max(0, Math.min(1, similarity)),
    capacity: WEIGHTS.capacity * Math.max(0, Math.min(1, spareRatio)),
    domain: domainMatch ? WEIGHTS.domain : 0,
  };
  return {
    parts,
    score: Math.round(parts.relevance + parts.capacity + parts.domain),
  };
}

const examples = {
  u0: [
    "Stakeholder management, Delivery planning, Risk management",
    "Coordinates fund launches, investor onboarding, cross-functional delivery and customer communication.",
  ],
  u1: [
    "Delivery planning, Reporting, Risk management",
    "Manages reporting releases, data migration schedules and operational dependencies.",
  ],
  u2: [
    "SQL, Data analysis, Financial reporting",
    "Reconciles financial datasets, defines reporting metrics and translates fund operations into requirements.",
  ],
  u3: [
    "Requirements analysis, Process mapping, Document review",
    "Maps investor onboarding journeys, reviews subscription documents and defines validation requirements.",
  ],
  u4: [
    "Python, APIs, Document processing",
    "Builds investor onboarding workflows, automated document extraction and validation, and API integrations.",
  ],
  u5: [
    "SQL, ETL, Data pipelines",
    "Builds reporting platforms, warehouse transformations, reconciliation jobs and reliable data migrations.",
  ],
  u6: [
    "Test automation, Data validation, SQL",
    "Tests financial calculations, reporting accuracy, reconciliation and data integrity for fund operations.",
  ],
  u7: [
    "Functional testing, Regression testing, Document review",
    "Validates onboarding journeys, subscription forms, document handling and release acceptance criteria.",
  ],
};

export const defaultRequirements = {
  "Project manager":
    "Coordinate customer communication, delivery milestones and risks across the squad.",
  Analyst:
    "Translate business processes into requirements, review documents and validate data.",
  Engineer:
    "Build and integrate reliable workflows for the customer requirements.",
  QA: "Verify acceptance criteria, run regression tests and validate data quality.",
};

// Add new fields without resetting earlier visitor edits, leave or assignments.
export function migrateWorkspace(state) {
  for (const p of state.people) {
    const sample = examples[p.id];
    p.capabilities ??= sample ? sample[0].split(", ") : [];
    p.experience ??= sample ? sample[1] : "";
  }
  for (const p of state.projects) {
    p.requirements ??= { ...defaultRequirements };
    p.requiredSkills ??= {};
    if (
      p.id === "p3" &&
      p.requirements.Engineer === defaultRequirements.Engineer
    ) {
      p.requirements.Engineer =
        "Automate extraction and validation of investor information from subscription documents and connect the workflow to APIs.";
    }
    if (
      p.id === "p4" &&
      p.requirements.Engineer === defaultRequirements.Engineer
    ) {
      p.requirements.Engineer =
        "Move historical records into a reporting warehouse using ETL pipelines and SQL transformations.";
    }
  }
  state.schemaVersion = 2;
  return state;
}
