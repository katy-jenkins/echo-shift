# EchoShift — project guide for Claude

A school staff-rostering app for SLSOs (School Learning Support Officers), built by
Maddy on Base44 and ported to an independent stack. Maddy is the non-technical
owner; Katy is the technical helper. The goal is for Maddy to eventually self-edit
this app with an in-browser AI (Lovable), with Katy handling anything code-level.

## Stack

- **Frontend:** React 18 + Vite + Tailwind + `@tanstack/react-query`. Drag-and-drop
  via `@hello-pangea/dnd`. (Unchanged from the original Base44 export.)
- **Backend:** Supabase (Postgres + Auth). Project `echo-shift`, region Sydney.
- **Repo:** github.com/katy-jenkins/echo-shift (personal account `katy-jenkins`).

## Architecture (how the port works)

The Base44 backend was replaced by swapping **only the data layer** — every page,
component, and the term-date logic is byte-for-byte the original:

- `src/api/supabaseClient.js` — the real Supabase client (reads `VITE_SUPABASE_*`).
- `src/api/base44Client.js` — a **facade** exposing the same `base44.entities.*`
  (`list/filter/create/update/delete/get`) and `base44.auth.*` shape the app already
  used, backed by Supabase. Filters translate Mongo-style `$gte/$lte/$lt/$gt`.
- `src/lib/AuthContext.jsx` — slimmed off Base44; same context shape.
- `supabase/migrations/0001_init.sql` — schema (text PKs preserve original ids).
- `scripts/seed.mjs` — one-off CSV → Supabase import (`npm run seed`).

When adding features, prefer the existing `base44.entities.*` calls; don't import
`@supabase/supabase-js` directly in pages.

## Data model

`worker` (SLSOs), `student` (funded students), `assignment` (Support Scheduler —
recurring Week A/B template), `booking` (Shift Planner — specific-date instances),
`absence` (roster/leave). No hard FKs: `assignment.student_id` may be a real id,
`"roll-call"`, or `"freetext-..."` (the "add text instead of a student" feature).

## Key facts / gotchas

- **App PIN:** `2468` (`src/components/PinGate.jsx`) — the real access gate.
- **Public read-only share tokens:** `?token=slso2026` (schedule),
  `?token=absences-readonly-2026` (absences).
- **Term dates are hardcoded** NSW 2026 in `src/lib/termDates.js`, incl. the
  Week A/B anchor (`2026-05-18` = Week B). Needs a manual yearly edit (deferred).
- **`_import/` is gitignored** — it holds the original Base44 export + CSVs with
  **real student PII**. Never commit it.
- **`.env.local`** (gitignored) holds `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
  See `SETUP.md` to recreate.

## Workflow

- **Simple versioning, NO pull requests.** Commit straight to `main` and push.
- Node 22 (`v22.19.0`). Commands: `npm run dev`, `npm run build`, `npm run seed`.
- GitHub auth on this machine is via the `gh` HTTPS credential helper (the SSH key
  is currently broken).

## Deferred improvements (intentionally not done in the clean port)

1. Real auth + Row-Level Security (proper editor vs read-only sharing, replacing the
   shared PIN + public-token model).
2. Editable term dates / Week A/B anchor (so Maddy can roll over each year herself).
3. Lint cleanup of pre-existing unused imports in `TermCalendar.jsx` / `Workers.jsx`.

## Next milestone

Connect **Lovable** to the `echo-shift` GitHub repo + Supabase so Maddy can edit
with AI in the browser, with changes auto-versioned to `main`.
