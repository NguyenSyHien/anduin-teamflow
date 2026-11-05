# Validation — semantic matching upgrade

Validated on November 4, 2026.

## Automated checks

`npm test`: 20 passing checks for scheduling, cosine similarity, score calculation, mandatory skills, expertise, leave, profile input changes, workspace migration, missing model outputs, worker errors, cancellation and stale results. `npm run build` validates the static application files. Unit tests inject synthetic similarity scores where appropriate to test constraints independently of the downloaded model.

## Real browser inference

Actual quantized MiniLM inference ran through Transformers.js in the in-app browser against the local preview. The default Atlas project produced four feasible candidates, including Emma for document extraction and API work. All three ranking components were visible.

For a controlled scenario, the same project was moved to December 7–18, when both engineers were available. The engineering brief was changed to SQL transformations, ETL pipelines, reconciliation and warehouse migration. Semantic matching selected Ethan (84 points) ahead of Emma (73 points), while the original rules baseline selected Emma. This demonstrates a real text-dependent ranking change, not a hard-coded keyword demo. These scores are one observed run, not quality guarantees.

Adding mandatory skill Rust left the engineering slot unfilled; both candidates were disabled. Applying the incomplete squad showed an error and did not commit it. The rules comparison mode displayed its own label and scores. A specialist experience edit saved and was displayed in Team.

## Quality limits

These checks establish implementation behavior, not business accuracy. Production leads still need to label representative project/candidate pairs, measure top-3 suitability and compare rankings with the baseline. General sentence similarity is not a measure of productivity or successful delivery.


## AI intake upgrade — November 5, 2026

- 28 automated tests pass, including schema/outline validation, unsupported and duplicate roles, cancellation/stale messages, configurable one-role squads, approval snapshots, reapproval after changes, and capacity checks excluding the project's own committed allocations.
- Static build and JavaScript syntax checks pass.
- Browser verified: manual intake; removing three roles; blocking approval without review confirmation; approving a single-Analyst plan; real MiniLM ranking; applying the squad; changing effort and saving causes Needs review and clears allocations; unscheduled drafts survive reload.
- SmolLM2 downloaded and performed actual inference in the browser. It returned a readable four-role outline for the investor migration brief; its initial JSON-format contract was unreliable. An explicit-heading outline parser was added and tested. Later outline runs still failed validation; the latest diagnostic browser check was blocked by the automatic approval review account usage limit. Successful end-to-end AI intake generation remains unverified and is a release limitation. Do not represent this as a fully verified AI intake release.
- Approval names are self-reported in the demo. Browser-only storage and the fixed November overview are unchanged limitations.


## OpenAI integration — November 5, 2026

Supersedes the local drafting failure above. 32 tests pass. The actual server handler returned HTTP 200 with a validated structured staffing proposal and scope questions from OpenAI for the migration example. Key presence was verified without displaying it, and the hosted secret was configured. Browser QA of this replacement has not yet been completed.
