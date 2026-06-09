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

## Architecture (Supabase-native)

The app was first ported from Base44 via a `base44.entities.*` compatibility
facade, then migrated to **direct Supabase calls** so Lovable's AI (which generates
Supabase-native code) can extend it naturally. The facade is gone.

- `src/api/supabaseClient.js` — the Supabase client (reads `VITE_SUPABASE_*`).
  Every page/component imports `{ supabase }` from here.
- **Data access is inline** in `@tanstack/react-query` `queryFn`/`mutationFn`:
  `supabase.from('<table>').select('*')…`, `.insert(v).select().single()`,
  `.update(v).eq('id', id).select().single()`, `.delete().eq('id', id)`. Date
  ranges use `.gte()/.lte()/.lt()/.gt()`. Tables are lowercase singular
  (`worker`, `student`, `assignment`, `booking`, `absence`).
- `src/lib/AuthContext.jsx` / `PageNotFound.jsx` — use `supabase.auth.getUser()` /
  `signOut()` directly; same context shape as before.
- `supabase/migrations/0001_init.sql` — schema (text PKs preserve original ids).
- `scripts/seed.mjs` — one-off CSV → Supabase import (`npm run seed`).

When adding features, use `supabase.from(...)` directly in the React Query hooks —
matching the existing pattern — so Lovable stays consistent.

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
