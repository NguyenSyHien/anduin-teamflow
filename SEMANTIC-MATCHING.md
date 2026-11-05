# Semantic squad matching

## What is implemented

Teamflow uses a real pretrained sentence embedding model, `Xenova/all-MiniLM-L6-v2` (Apache-2.0), through Transformers.js 3.8.1. A module web worker loads the quantized ONNX model and runs WebAssembly inference on the visitor's device. This keeps the static deployment compatible with both Sites and Vercel, with no API keys, Python server, or inference bills.

Each specialist has explicit skills and a free-text experience profile. Each project has a free-text requirement and optional mandatory skills for each discipline. Names, customer names and identifiers are excluded from the text assembled for the model. The model receives role, capability tags, experience and domain. Text is not uploaded to an inference API. The browser downloads model assets from Hugging Face and runtime assets from jsDelivr; those hosts receive ordinary asset requests.

Mean pooling and normalization produce 384-dimensional embeddings. Cosine similarity is computed between each role requirement and each profile. Negative similarity contributes zero ranking points. Model files use the library's browser cache; computed embeddings use a bounded in-memory cache keyed by full text. Changing any input changes its cache key. Reloading clears embedding memory but may reuse downloaded assets.

## Hard constraints, then ranking

Candidates must have the same canonical discipline, meet the minimum expertise level, possess every explicitly required skill tag (trimmed and case insensitive), and have enough spare capacity on **every** working day. Role aliases and qualifications are not inferred from a high similarity score. Effort is distributed evenly over weekdays. Existing bookings, leave and the project's own previous assignment are handled by the scheduling engine.

For feasible candidates:

`score = round(65 * max(0, cosine) + 25 * clamp(averageSpare / dailyCapacity, 0, 1) + 10 * domainMatch)`

The three component values are shown in the UI. These are explicit prototype weights, not learned or calibrated probabilities. Semantic relevance includes experience text; there is no invented separate measure of past performance. Infeasible candidates remain visible with blockers but cannot be selected. Apply validates all hard constraints again.

The baseline comparison uses the original domain/capacity/seniority rule. Both modes enforce identical hard constraints. Switching modes resets draft selections. A committed project stores the chosen mode, model name, timestamp and selected scores in its workspace export.

## Failure handling

The UI shows model loading and inference progress. Visitors may cancel or choose the rules baseline. A 180-second timeout, worker error or download failure produces a visibly labeled fallback; it never fabricates embeddings or presents rules as ML. Retry starts another attempt. Closing a loading dialog cancels its worker; late results cannot replace a different dialog. Completed workers can be reused for subsequent requests.

## Evaluation

Run `npm test`. Unit tests verify cosine math, score components, changed-input serialization, workspace migration, rank changes, mandatory skills, leave, expertise, missing model output and invalid assignments. Synthetic scores in unit tests isolate the constraint/ranking logic; they are not evidence of model quality. Browser QA runs the actual model on fictional profiles. A production evaluation should use independent labels from delivery leads for top-3 suitability, pairwise ranking preference, and zero infeasible assignments. Compare against the rules baseline, including sparse profiles, synonymous wording and hard-to-staff projects.

## Known limitations

The model is a general English sentence model, not a model trained on Anduin staffing outcomes. Concise English profiles work best. Similarity is not probability of delivery success. The app limits text lengths to keep descriptions short, but tokenizer truncation can still occur. Expertise is still one level per person, not per skill. Mandatory skills rely on declared exact tags; spelling variants should be standardized by the manager. Team size is small and inference processes texts sequentially. First use needs internet and a modern browser with module workers and WASM. Browser cache may be evicted. No shared backend, global optimization, cost optimization, or automatic reassignment is provided.

## Sources

- https://huggingface.co/Xenova/all-MiniLM-L6-v2
- https://huggingface.co/docs/transformers.js
- https://www.sbert.net/examples/sentence_transformer/applications/semantic-search/README.html
