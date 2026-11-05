# Teamflow

Live demo: https://anduin-teamflow.adored-char-2796.chatgpt.site

Public repository: https://github.com/NguyenSyHien/anduin-teamflow

## AI staffing intake

Choose **New project**, paste the customer request, and select **Draft roles with AI**. The local SmolLM2 language model proposes roles, responsibilities and reasons. The production lead edits the plan, confirms dates and effort, then approves requirements. MiniLM recommends people only after that review; applying the squad remains a separate action. Required roles are configurable. Manual planning is explicitly labeled.

First AI intake use downloads approximately 365 MB plus runtime and can take several minutes. No API key is needed. See [AI-INTAKE.md](AI-INTAKE.md) for architecture and prototype limits.

## Core feature: semantic squad matching

Teamflow now runs real MiniLM sentence embeddings in a browser worker. Editable specialist experience and skills are matched against role-specific project requirements. Role, expertise, mandatory skills, leave and daily capacity remain hard constraints. Review score components, compare against the rules baseline, then approve a feasible squad.

Open **Matching → Try semantic squad matching**, review the brief, and confirm the production lead review, then choose **Approve requirements & find squad**. First use downloads the pretrained model and runtime; subsequent uses can reuse cached files. No API key is required and profile text stays on the device. A loading failure is explicitly labeled as rules-based fallback, with a retry button.

Read [SEMANTIC-MATCHING.md](SEMANTIC-MATCHING.md) for architecture, scoring, privacy, evaluation and limitations.

A capacity-aware squad planner built for the Anduin AI Business Associate take-home assignment. Fictional people and customers; not an official Anduin product.

## Run locally

Requires Node.js 20 or newer. No dependency installation or API keys required.

```sh
npm start
```

Open http://127.0.0.1:4173. Run `npm test` for scheduling checks and `npm run build` to validate the static deployment bundle.

## What it does

- Portfolio dashboard with four-week capacity heatmap and daily conflict flags.
- Project intake: customer, dates, domain, expertise, priority and effort by discipline.
- Explainable recommendations for a project manager, analyst, engineer and QA specialist.
- Human review of alternative candidates; assignments cannot exceed daily capacity.
- Leave management, conflict detection and replanning when dates or requirements change.
- Browser persistence, local activity history, workspace export and demo reset.
- Responsive styling, keyboard-accessible dialogs and escaped user-entered text.

## Two-minute demo

1. Open Overview. Emma's leave makes Northstar fund onboarding at risk even though average utilization is modest.
2. Review Northstar's squad. Its current window has no feasible engineer. Move the deadline to November 6 and reduce engineering effort to 30 hours (with other role effort also fitting daily capacity), or choose another feasible future window. Review and apply only when all selected roles can be staffed.
3. Open Atlas subscription workflow and find a squad. Review expertise, daily effort and alternate specialists; apply the recommendation.
4. Add leave for an assigned person during the project. Observe the conflict on the dashboard; reopen the project to explore a new plan.
5. Review Activity and export your workspace.

## Decision model

Each role's total effort is spread evenly over weekdays in the project's inclusive date window. The engine filters candidates by role and minimum expertise. A candidate is feasible only if spare capacity meets that daily effort on **every day**, accounting for all other committed projects and full-day leave. Replanning excludes the same project's existing bookings to avoid double-counting.

In the default ML mode, feasible candidates rank by positive cosine similarity (up to 65 points), average spare capacity (up to 25), and exact domain match (10). The rules baseline uses domain match (40), spare capacity (up to 40), and expertise above the minimum (5 per level). Stable name sorting breaks ties. Domain is a preference; role, expertise, mandatory skills and capacity are hard constraints. Priority is a visible triage signal, not automatic preemption. An unfillable role remains empty and blocks application.

The pretrained model is a sentence encoder, not a generative chatbot. Model relevance does not certify qualifications or predict successful delivery. The system does not claim global optimality; it ranks one project's role candidates at a time. Future effort estimation or generative assistance should continue to validate outputs against explicit constraints.

## Assumptions and limits

One specialist per role; eight-hour default days; Monday–Friday workweek; full-day leave; evenly distributed effort; no public holidays or dependencies. The fixed November 2026 overview is a demo lens; project-level recommendations validate their full entered date range. Data is saved in the visitor's browser, not shared between users. Reset clears local edits. Export is for inspection/backup; import is not implemented. There is no authentication or backend. Font loading uses Google Fonts with local fallback fonts.

## Architecture

`dist/engine.js` contains pure scheduling functions. `dist/semantic-core.js` handles model inputs, similarity, score components and migration. `dist/semantic-worker.js` runs quantized MiniLM inference through Transformers.js 3.8.1. `dist/semantic-client.js` manages progress, cancellation, retry and timeout. `dist/app.js` owns state and UI. `server.mjs` is a dependency-free local static server. Tests use the built-in Node test runner. The static application can be hosted on Vercel, GitHub Pages or any HTTPS static host. First ML use requires access to Hugging Face and jsDelivr.

## Deploy on Vercel

Import the public GitHub repository into Vercel. Select Other as framework, `npm run build` as build command and `dist` as output directory. These settings are also provided in `vercel.json`. No environment variables are required.

## Product rationale

Production leads need to understand why delivery is at risk, not just see average utilization. Teamflow exposes daily conflicts, keeps staffing decisions reviewable, and makes changes immediately visible. Success metrics: staffing time, overload days, on-time delivery and utilization variance. Next priorities: shared durable storage, access control, real calendar integrations, partial-day availability, flexible role headcount, historical effort estimation and global assignment optimization.

See `SUBMISSION.md` for the suggested presentation narrative.
