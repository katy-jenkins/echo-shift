-- EchoShift schema — faithful 1:1 port of the Base44 entities.
--
-- Notes:
--  * Primary keys are TEXT so the existing Base44 record ids (24-char hex) import
--    verbatim, keeping every slso_id / student_id / worker_id / cover_worker_id
--    cross-reference intact. New rows get a uuid-as-text.
--  * No foreign-key constraints between assignment/booking and student: some rows
--    intentionally reference "roll-call" or "freetext-..." instead of a real
--    student (Base44's "add text instead of a student" feature). This mirrors
--    Base44, which did not enforce relational integrity.
--  * RLS is enabled with permissive policies for the anon/authenticated roles.
--    This reproduces the current shared-access model (anyone with the app + PIN
--    can read/write; public pages read). Tightening this into real editor/viewer
--    auth is the first deferred improvement, not part of the clean port.

create extension if not exists pgcrypto;

-- Auto-maintain updated_date on every UPDATE (Base44 behaviour).
create or replace function set_updated_date()
returns trigger as $$
begin
  new.updated_date = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- worker  (the SLSOs)
-- ---------------------------------------------------------------------------
create table worker (
  id           text primary key default gen_random_uuid()::text,
  name         text not null,
  role         text,
  work_days    jsonb default '[]'::jsonb,   -- e.g. [1,3,5] = Mon/Wed/Fri
  color        text,
  sort_order   numeric,
  is_sample    boolean default false,
  created_by   text,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- student  (funded students)
-- ---------------------------------------------------------------------------
create table student (
  id                      text primary key default gen_random_uuid()::text,
  name                    text not null,
  year_group              text,
  notes                   text,
  is_funded               boolean default false,
  funded_lessons_per_week numeric,
  is_sample               boolean default false,
  created_by              text,
  created_date            timestamptz default now(),
  updated_date            timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- assignment  (Support Scheduler — recurring Week A/B template)
-- ---------------------------------------------------------------------------
create table assignment (
  id           text primary key default gen_random_uuid()::text,
  week_type    text,                         -- 'A' | 'B'
  day          text,                         -- 'Monday'..'Friday'
  period       integer,                      -- 0 = roll-call row, 1..4 = lessons
  student_id   text,                         -- Student.id | 'roll-call' | 'freetext-...'
  student_name text,
  slso_id      text,                         -- Worker.id
  slso_name    text,
  subject      text,
  room_number  text,
  notes        text,
  is_sample    boolean default false,
  created_by   text,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- booking  (Shift Planner — specific-date instances, generated from template)
-- ---------------------------------------------------------------------------
create table booking (
  id               text primary key default gen_random_uuid()::text,
  date             date,
  period           integer,                  -- 1..4
  student_id       text,
  student_name     text,
  slso_id          text,
  slso_name        text,
  subject          text,
  room_number      text,
  notes            text,
  is_cancelled     boolean default false,
  is_from_template boolean default false,
  is_sample        boolean default false,
  created_by       text,
  created_date     timestamptz default now(),
  updated_date     timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- absence  (Roster / Absence Summary)
-- ---------------------------------------------------------------------------
create table absence (
  id              text primary key default gen_random_uuid()::text,
  worker_id       text,                       -- Worker.id (absent)
  date            date,
  leave_type      text,                       -- lwop|sick|facs|excursion|extended_leave|other
  cover_worker_id text,                       -- Worker.id (covering), optional
  notes           text,
  is_sample       boolean default false,
  created_by      text,
  created_date    timestamptz default now(),
  updated_date    timestamptz default now()
);

-- Helpful indexes for the date-range / week-type filters the app runs.
create index on assignment (week_type);
create index on booking (date);
create index on absence (date);

-- updated_date triggers
create trigger t_worker_updated     before update on worker     for each row execute function set_updated_date();
create trigger t_student_updated    before update on student    for each row execute function set_updated_date();
create trigger t_assignment_updated before update on assignment for each row execute function set_updated_date();
create trigger t_booking_updated    before update on booking    for each row execute function set_updated_date();
create trigger t_absence_updated    before update on absence    for each row execute function set_updated_date();

-- ---------------------------------------------------------------------------
-- Row-Level Security: permissive shared-access policies (faithful to current
-- model). Replace with editor/viewer policies when we add real auth.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['worker','student','assignment','booking','absence']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format($p$create policy %I on %I for all to anon, authenticated using (true) with check (true);$p$,
                   t || '_all_access', t);
  end loop;
end $$;
