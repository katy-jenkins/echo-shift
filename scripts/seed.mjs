// Seed a Supabase project from the original Base44 CSV exports in _import/.
//
// Idempotent: upserts on `id`, so it is safe to re-run. Preserves the original
// record ids verbatim so all slso_id / student_id / worker_id cross-references
// stay valid. Run AFTER applying supabase/migrations/0001_init.sql.
//
// Requires (in .env.local, NOT committed):
//   SUPABASE_URL=...                     (your project URL)
//   SUPABASE_SERVICE_ROLE_KEY=...        (Settings → API → service_role; bypasses RLS for import)
//
// Usage:  npm run seed
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const importDir = join(rootDir, '_import');

// Load .env.local (preferred) then .env as fallback.
config({ path: join(rootDir, '.env.local') });
config({ path: join(rootDir, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// service_role is ideal (bypasses RLS), but the permissive policies let the
// publishable/anon key seed too — so fall back to it when no secret is set.
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase URL/key in .env.local — see SETUP.md.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// --- value coercion helpers -------------------------------------------------
const str = (v) => (v === '' || v == null ? null : v);
const num = (v) => (v === '' || v == null ? null : Number(v));
const bool = (v) => (v === 'true' ? true : v === 'false' ? false : null);
const json = (v) => {
  try { return JSON.parse(v || '[]'); } catch { return []; }
};
// keep the original timestamps/meta so created_date ordering is preserved
const meta = (r) => ({
  is_sample: bool(r.is_sample) ?? false,
  created_by: str(r.created_by),
  created_date: str(r.created_date),
  updated_date: str(r.updated_date),
});

// --- per-table row mappers --------------------------------------------------
const mappers = {
  worker: (r) => ({
    id: r.id, name: r.name, role: str(r.role), work_days: json(r.work_days),
    color: str(r.color), sort_order: num(r.sort_order), ...meta(r),
  }),
  student: (r) => ({
    id: r.id, name: r.name, year_group: str(r.year_group), notes: str(r.notes),
    is_funded: bool(r.is_funded) ?? false, funded_lessons_per_week: num(r.funded_lessons_per_week),
    ...meta(r),
  }),
  assignment: (r) => ({
    id: r.id, week_type: str(r.week_type), day: str(r.day), period: num(r.period),
    student_id: str(r.student_id), student_name: str(r.student_name),
    slso_id: str(r.slso_id), slso_name: str(r.slso_name),
    subject: str(r.subject), room_number: str(r.room_number), notes: str(r.notes), ...meta(r),
  }),
  booking: (r) => ({
    id: r.id, date: str(r.date), period: num(r.period),
    student_id: str(r.student_id), student_name: str(r.student_name),
    slso_id: str(r.slso_id), slso_name: str(r.slso_name),
    subject: str(r.subject), room_number: str(r.room_number), notes: str(r.notes),
    is_cancelled: bool(r.is_cancelled) ?? false, is_from_template: bool(r.is_from_template) ?? false,
    ...meta(r),
  }),
  absence: (r) => ({
    id: r.id, worker_id: str(r.worker_id), date: str(r.date), leave_type: str(r.leave_type),
    cover_worker_id: str(r.cover_worker_id), notes: str(r.notes), ...meta(r),
  }),
};

// Insert parents before children so any future FK constraints would be satisfied.
const order = [
  ['worker', 'Worker_export.csv'],
  ['student', 'Student_export.csv'],
  ['assignment', 'Assignment_export.csv'],
  ['booking', 'Booking_export.csv'],
  ['absence', 'Absence_export.csv'],
];

function parseCsv(file) {
  const text = readFileSync(join(importDir, file), 'utf8');
  return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
}

async function run() {
  for (const [table, file] of order) {
    const rows = parseCsv(file).map(mappers[table]);
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error(`✗ ${table}: ${error.message}`);
      process.exit(1);
    }
    console.log(`✓ ${table.padEnd(11)} ${rows.length} rows`);
  }
  console.log('\nSeed complete.');
}

run();
