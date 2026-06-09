# EchoShift

A school staff-rostering app for SLSOs (workers, roster, absences, students,
support scheduler, shift planner). Originally built on Base44, now ported to an
independent **React + Vite + Supabase** stack.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase keys
npm run dev
```

First time? Follow **[SETUP.md](./SETUP.md)** to create the free Supabase project,
build the schema, and import the data. App PIN is **2468**.

## Stack

- **Frontend:** React 18 + Vite + Tailwind (unchanged from the original export).
- **Backend:** Supabase (Postgres + Auth). The app talks to it through a thin
  compatibility layer in `src/api/` that keeps the original `base44.entities.*`
  call shape, so the page code didn't change.
- **Data model:** `worker`, `student`, `assignment` (Week A/B template),
  `booking` (dated instances), `absence`. See `supabase/migrations/0001_init.sql`.

## Project layout

| Path | What |
|---|---|
| `src/` | The app (pages, components, term-date logic) |
| `src/api/` | Supabase client + the Base44-compatibility facade |
| `supabase/migrations/` | Database schema |
| `scripts/seed.mjs` | One-off CSV → Supabase data import (`npm run seed`) |
| `_import/` | Original Base44 export + CSVs — **gitignored** (contains student PII) |

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run seed` — import the CSV data into Supabase (see SETUP.md)
