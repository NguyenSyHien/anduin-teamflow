# OpenAI staffing intake

Customer brief → server-side OpenAI draft → lead review → semantic matching → separate squad approval.

The Sites Worker calls the Responses API with gpt-4.1-mini-2025-04-14, a strict JSON schema and store:false. It validates roles, duplicates and bounded descriptions again before returning a proposal. Only the brief is sent to OpenAI. The API key exists only in ignored local environment files and the hosted runtime secret, never public assets. Model output is a proposal, not verified project facts.

The lead can add/remove the four supported role types, edit responsibilities and mandatory skills, and confirm dates, expertise and effort. Unknown dates and effort remain empty. Questions and assumptions now come from the model. Original proposals and approval snapshots remain in local workspace export. Existing SmolLM-era proposals remain readable.

Errors preserve the brief and offer manual planning. Requests are limited to 2,000 characters with bounded bodies, 1,800 output tokens and a 45-second provider timeout. Same-origin checks and best-effort per-isolate limits (10 requests per IP/hour, 100 total/hour) reduce casual abuse; these are not authentication or a global spending cap. This public demo's API calls use the owner's API billing. Production should add authenticated access, durable quotas and shared storage. Reviewer names remain self-reported and local history is not tamper-proof.

## Local run

Keep OPENAI_API_KEY in .env.local, then run npm run build and node --env-file=.env.local server.mjs. The build embeds only an allowlist of public assets into a Worker ESM bundle. Never serve the repository root.

## Validation

32 automated tests pass. A live request using the fictional investor-data migration brief returned Project manager, Engineer and QA, with five clarification questions. Assess omission and unnecessary-role rates on representative briefs with production leads before relying on the suggestions in production.
