# EchoShift — Supabase setup (one-time)

This connects the ported app to a real database. It's the only step that needs a
browser/account — everything else (schema, data import, app wiring) is already in
the repo. Takes ~10 minutes. **Free tier, no card required.**

## 1. Create a free Supabase project
1. Go to **supabase.com** → sign in with GitHub → **New project**.
2. Name it `echoshift`, pick a region close to you (e.g. Sydney), set a database
   password (save it somewhere), choose the **Free** plan → **Create**.
3. Wait ~2 min for it to provision.

## 2. Create the database schema
1. In the project, open **SQL Editor** (left sidebar) → **New query**.
2. Open `supabase/migrations/0001_init.sql` from this repo, copy the whole file,
   paste it in, and click **Run**. You should see "Success".
3. (Optional check) **Table Editor** should now list: worker, student,
   assignment, booking, absence — all empty for now.

## 3. Get your keys into .env.local
1. In Supabase: **Project Settings → API**.
2. Copy these three values:
   - **Project URL**
   - **anon public** key
   - **service_role** key (under "Project API keys" — keep this secret)
3. In the repo, copy `.env.example` to `.env.local` and paste the values in:
   ```bash
   cp .env.example .env.local
   ```
   Set `VITE_SUPABASE_URL` + `SUPABASE_URL` to the Project URL,
   `VITE_SUPABASE_ANON_KEY` to the anon key, and
   `SUPABASE_SERVICE_ROLE_KEY` to the service_role key.

## 4. Import the existing data
```bash
npm install        # if you haven't already
npm run seed       # loads the 5 CSVs from _import/ into Supabase
```
Expect output like `✓ worker  15 rows`, `✓ student  25 rows`, etc. Safe to re-run.

## 5. Run the app
```bash
npm run dev
```
Open the printed localhost URL. The PIN is **2468** (unchanged from before).
Public read-only pages: `/public-schedule` and `/public-absences`.

---

### What changed vs the Base44 version
- **Backend:** Base44's hosted DB/auth → your own Supabase project.
- **Code:** only the data layer (`src/api/`) and auth wiring (`src/lib/AuthContext.jsx`)
  were swapped. Every page, the drag-and-drop, and the Week A/B term logic are
  unchanged.
- **Access model:** still the shared PIN + public pages (faithful port). Proper
  per-user editor/viewer logins are the first planned improvement, not part of
  this port.

### Deferred improvements (not done yet, by design)
1. Real auth + Row-Level Security (editor vs read-only sharing).
2. Editable term dates / Week A/B anchor (currently hardcoded NSW 2026).
3. Lint cleanup of pre-existing unused imports in `TermCalendar.jsx` / `Workers.jsx`.
