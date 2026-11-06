# Teamflow

Live demo: https://anduin-teamflow.adored-char-2796.chatgpt.site

Public repository: https://github.com/NguyenSyHien/anduin-teamflow

Teamflow helps production leads turn customer requests into staffing plans and assign the right specialists based on expertise, workload, and availability.

# User Journey and System Architecture

<img width="1072" height="711" alt="image" src="https://github.com/user-attachments/assets/2524fdba-708b-431a-8f7e-a817929d953d" />

# The problem

Staffing projects through manual coordination makes it difficult to spot overloaded specialists, unused capacity, and delivery risks. Changes to deadlines or availability create more planning work.

Teamflow brings project requirements, team expertise, and capacity into one workflow.

How it works
1. Describe the project: Enter the customer’s request.
2. Review the staffing proposal: An LLM suggests roles and responsibilities, highlighting assumptions and open questions.
3. Approve the requirements: The production lead confirms roles, dates, effort, and required expertise.
4. Find a squad: Semantic matching ranks relevant specialists; capacity rules check whether they can take the work.
5. Apply and monitor: The lead confirms the squad. The dashboard updates bookings, utilization, and conflicts as plans change.

# Architecture
<img width="1462" height="1598" alt="mermaid-diagram (1)" src="https://github.com/user-attachments/assets/5bf35378-b6e7-4753-bb6e-45f4d1145372" />

Layer 1 — Understand the work: A server-side LLM converts an unstructured brief into a structured staffing proposal.

Layer 2 — Keep people accountable: The production lead edits and approves the proposal before matching. AI suggestions do not automatically assign anyone.

Layer 3 — Match expertise and availability: A pretrained MiniLM model runs in the browser to compare role requirements with specialist profiles. Candidates must also pass role, expertise, mandatory-skill, leave, and daily-capacity checks.

The interface uses JavaScript and CSS, with a server-side API for LLM requests. Workspace records currently persist in browser-local storage.

# Why it helps Anduin
- Faster planning: Converts customer requests into a reviewable starting plan.
- Better workload visibility: Shows booked capacity alongside incoming project demand.
- Earlier risk detection: Identifies daily overbooking and leave conflicts.
- More informed staffing: Considers relevant experience alongside availability.
- Easier replanning: Recalculates the picture when project or team information changes.

# Reliability by design
Semantic relevance influences ranking, but cannot override feasibility checks. The app revalidates a squad before applying it, shows reasons for blocked candidates, and requires human approval. If semantic matching is unavailable, a clearly labeled rules-based fallback remains available.

Matching scores indicate relevance—not guaranteed performance. Automated tests cover capacity calculations, approval gates, matching constraints, and dashboard updates.

# Current scope
The app supports editable projects, team profiles, leave, planning dates, staffing approval, squad matching, and an interactive dashboard. Fictional sample data is included for demonstrations.

It currently assumes one specialist per selected role, weekday working schedules, and evenly distributed project effort. Shared storage, authenticated accounts, and a tamper-resistant audit trail are next steps for a multi-user production rollout.
