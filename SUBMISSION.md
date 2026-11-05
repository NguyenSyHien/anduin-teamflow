# Submission notes

## Problem framing

The coordination bottleneck is the lack of a common model connecting demand (discipline, effort, deadline) to supply (expertise and time). Average workload hides critical daily constraints. A useful assistant must surface those constraints and allow a production lead to inspect and change the plan.

## Proposed solution

Teamflow connects project intake, a capacity heatmap, ML semantic squad recommendations and scenario replanning. A pretrained MiniLM sentence encoder compares role requirements with editable specialist experience and skill descriptions. A human reviews each suggestion, its score breakdown and the rules baseline. The application refuses infeasible assignments and shows how leave affects committed work.

## Why this scope

The prototype makes the main decision loop testable without accounts or API keys. Semantic inference runs locally in a browser worker, while explicit constraints enforce qualifications and daily feasibility. The model helps interpret related expertise; it never invents allocations or overrides availability. Profile text is not sent to an inference service.

## Validation and trade-offs

Automated tests cover scheduling, cosine similarity, weighted scores, required skills, migration and ML ranking without constraint bypass. Browser verification exercises real pretrained-model inference and compares it with the baseline. The model is not trained on Anduin outcomes, and ranking weights need validation by production leads. The MVP does not globally optimize across projects, split roles among people, or estimate productivity from historical data. Local browser persistence is not a multi-user production architecture.

## Business impact to measure

- Reduction in time to form a feasible squad.
- Reduction in overloaded person-days and missed deadlines.
- Lower utilization variance without forcing every specialist to 100% load.
- Recommendation acceptance and reasons for human overrides.

## Suggested next experiment

Run a two-week shadow pilot with production leads, compare recommended squads against actual decisions, and capture effort estimate error and override reasons. Use those observations to tune constraints and ranking before automating any decisions.

## AI staffing intake

Customer brief → server-side OpenAI staffing draft → production lead edits and approval → MiniLM candidate matching → separate assignment approval. Selected roles are configurable; unknown effort remains for the lead to estimate. Original proposals and approval snapshots are included in workspace export. See AI-INTAKE.md for design, evaluation and limitations.
