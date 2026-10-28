# Teamflow

Live demo: https://anduin-teamflow.adored-char-2796.chatgpt.site

Public repository: https://github.com/NguyenSyHien/anduin-teamflow

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
2. Review Northstar's squad. Its current window has no feasible engineer. Move the deadline to November 6 and reduce engineering effort to 30 hours (with other role effort also fitting daily capacity), or choose another feasible future window. Review and apply only when all four roles can be staffed.
3. Open Atlas subscription workflow and find a squad. Review expertise, daily effort and alternate specialists; apply the recommendation.
4. Add leave for an assigned person during the project. Observe the conflict on the dashboard; reopen the project to explore a new plan.
5. Review Activity and export your workspace.

## Decision model

Each role's total effort is spread evenly over weekdays in the project's inclusive date window. The engine filters candidates by role and minimum expertise. A candidate is feasible only if spare capacity meets that daily effort on **every day**, accounting for all other committed projects and full-day leave. Replanning excludes the same project's existing bookings to avoid double-counting.

Feasible candidates rank by domain match (40 points), average spare capacity (up to 40 points), and expertise above the minimum (5 points per level). Stable name sorting breaks ties. Domain is a preference; expertise level and capacity are hard constraints. Priority is a visible triage signal, not automatic preemption. An unfillable role remains empty and blocks application.

This is an explainable, deterministic decision-support engine, **not an LLM integration or a claim of global optimality**. A production AI layer could turn natural-language briefs into structured effort estimates, explain trade-offs and ask clarifying questions; the same deterministic constraints should validate its outputs. This avoids treating plausible AI text as a feasible staffing plan.

## Assumptions and limits

One specialist per role; eight-hour default days; Monday–Friday workweek; full-day leave; evenly distributed effort; no public holidays or dependencies. The fixed November 2026 overview is a demo lens; project-level recommendations validate their full entered date range. Data is saved in the visitor's browser, not shared between users. Reset clears local edits. Export is for inspection/backup; import is not implemented. There is no authentication or backend. Font loading uses Google Fonts with local fallback fonts.

## Architecture

`dist/engine.js` contains pure scheduling functions. `dist/app.js` owns state and UI. `dist/style.css` defines the visual system. `server.mjs` is a dependency-free local static server. Tests use the built-in Node test runner. The static application can be hosted on Vercel, GitHub Pages or any HTTPS static host.

## Deploy on Vercel

Import the public GitHub repository into Vercel. Select Other as framework, `npm run build` as build command and `dist` as output directory. These settings are also provided in `vercel.json`. No environment variables are required.

## Product rationale

Production leads need to understand why delivery is at risk, not just see average utilization. Teamflow exposes daily conflicts, keeps staffing decisions reviewable, and makes changes immediately visible. Success metrics: staffing time, overload days, on-time delivery and utilization variance. Next priorities: shared durable storage, access control, real calendar integrations, partial-day availability, flexible role headcount, historical effort estimation and global assignment optimization.

See `SUBMISSION.md` for the suggested presentation narrative.
