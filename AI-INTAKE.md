# AI staffing intake

New project → customer brief → AI role draft → production lead review → semantic squad matching → assignment approval.

The app runs `HuggingFaceTB/SmolLM2-360M-Instruct` with Transformers.js 3.8.1 in a dedicated browser worker using quantized WASM inference. This is actual generative inference, separate from MiniLM candidate ranking. The first download is approximately 365 MB plus runtime; a supported desktop browser and sufficient memory are recommended. Downloads are cached when the browser permits. Generation can take minutes. There is no API key or inference bill. Customer brief text is processed on the visitor's device; model/runtime hosts receive ordinary download requests.

The model proposes a subset of Project manager, Analyst, Engineer and QA, with responsibilities and reasons. Output is parsed and checked for supported roles, duplicates and bounded nonempty descriptions. The small model is asked for a numbered role outline; only explicit supported role headings are accepted. The original outline remains visible and exportable. Its role descriptions supply proposed coverage; the UI explains when reasons repeat that coverage. Structured JSON responses are also supported. No role is inferred by keyword rules when parsing fails. Invalid output, a worker error or a five-minute timeout preserves the brief and offers retry/manual planning. No template is silently represented as AI output. Cancel terminates inference and stale messages cannot replace a newer dialog.

The lead may add/remove any of the four supported role types, edit responsibilities and mandatory skills, and must confirm dates, positive effort, expertise, reviewer name and the review checkbox before matching. Effort and dates are not invented by the model. The questions and assumptions shown below the proposal are a fixed review checklist, not model-generated fact extraction. Priority, domain and expertise have visible editable defaults. One specialist per selected role and even hours per working day remain MVP assumptions.

Approving requirements saves the project without assigning people. Applying the recommended squad is a separate action with independent feasibility validation. Saving changed requirements as a draft clears that project's old allocations; the UI explains this before saving. Changes invalidate prior approval. Original brief, model proposal and approval snapshots/notes are retained in the project and workspace JSON export.

This is a browser-local take-home prototype. Reviewer names are self-reported, not authenticated; approval history is not tamper-proof. Production use needs shared storage, authenticated lead permissions, durable audit events, model evaluation and richer staffing structures. A small general-purpose model can omit relevant work or suggest unnecessary roles; lead review is essential. Do not interpret a structured response as verified expertise or guaranteed delivery.

## Evaluation

Use representative customer briefs, have production leads independently define necessary roles, then measure role omission, unnecessary roles, reviewer edit rate, valid-output rate and time to approved staffing. Evaluate staffing generation separately from candidate relevance and scheduling feasibility. Existing scheduling constraints are enforced regardless of AI suggestions.

## Sources

- https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct
- https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct/tree/main/onnx
