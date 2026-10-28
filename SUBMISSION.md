# Submission notes

## Problem framing

The coordination bottleneck is the lack of a common model connecting demand (discipline, effort, deadline) to supply (expertise and time). Average workload hides critical daily constraints. A useful assistant must surface those constraints and allow a production lead to inspect and change the plan.

## Proposed solution

Teamflow connects project intake, a capacity heatmap, explainable squad recommendations and scenario replanning. A human reviews each suggestion. The application refuses infeasible assignments and shows how leave affects work already committed.

## Why this scope

The prototype makes the main decision loop testable without accounts or API keys. Deterministic constraints are more dependable than asking a language model to invent allocations. AI can later help interpret intake, estimate effort and communicate trade-offs while the scheduling engine enforces feasibility.

## Validation and trade-offs

Automated tests cover working days, daily capacity, expertise, domain ranking, leave, incomplete squads, and replanning without double-counting. The MVP does not globally optimize across all projects, split a role among people, or estimate productivity from historical data. Local browser persistence makes the demo easy to evaluate but is not a multi-user production architecture.

## Business impact to measure

- Reduction in time to form a feasible squad.
- Reduction in overloaded person-days and missed deadlines.
- Lower utilization variance without forcing every specialist to 100% load.
- Recommendation acceptance and reasons for human overrides.

## Suggested next experiment

Run a two-week shadow pilot with production leads, compare recommended squads against actual decisions, and capture effort estimate error and override reasons. Use those observations to tune constraints and ranking before automating any decisions.
