import { addDays, startOfWeek, isSameDay, parseISO, isWithinInterval, format } from "date-fns";

// NSW Public School Term Dates 2026
// Term 1: Wed 28 Jan – Fri 10 Apr
// Term 2: Mon 27 Apr – Fri 3 Jul
// Term 3: Mon 20 Jul – Fri 25 Sep
// Term 4: Mon 12 Oct – Fri 18 Dec
export const NSW_TERMS_2026 = [
  { term: 1, start: "2026-01-28", end: "2026-04-10" },
  { term: 2, start: "2026-04-27", end: "2026-07-03" },
  { term: 3, start: "2026-07-20", end: "2026-09-25" },
  { term: 4, start: "2026-10-12", end: "2026-12-18" },
];

// NSW Public Holidays 2026 (school-relevant ones)
export const NSW_PUBLIC_HOLIDAYS_2026 = [
  "2026-01-26", // Australia Day
  "2026-04-03", // Good Friday
  "2026-04-06", // Easter Monday
  "2026-04-25", // Anzac Day
  "2026-06-08", // King's Birthday
  "2026-08-03", // Bank Holiday
  "2026-10-05", // Labour Day
];

// Current week (21 May 2026) is Week B.
// The Monday of the week containing 21 May 2026 is 18 May 2026.
// We anchor Week B to Mon 18 May 2026.
// Weeks alternate A/B from there.
const ANCHOR_MONDAY = parseISO("2026-05-18"); // This is a Week B week

/**
 * Given any date, return the A/B week type for that school week.
 * Returns null if date is not in a school term or is a weekend.
 */
export function getWeekType(date) {
  const mon = startOfWeek(date, { weekStartsOn: 1 });
  const diffMs = mon.getTime() - ANCHOR_MONDAY.getTime();
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  // diffWeeks=0 → B, 1 → A, 2 → B, ...
  return diffWeeks % 2 === 0 ? "B" : "A";
}

/**
 * Returns the school term number for a date, or null if not in term.
 */
export function getTermForDate(date) {
  const d = format(date, "yyyy-MM-dd");
  for (const t of NSW_TERMS_2026) {
    if (d >= t.start && d <= t.end) return t.term;
  }
  return null;
}

/**
 * Is this date a NSW public holiday?
 */
export function isPublicHoliday(date) {
  const d = format(date, "yyyy-MM-dd");
  return NSW_PUBLIC_HOLIDAYS_2026.includes(d);
}

/**
 * Is this a school day? (Mon–Fri, in term, not a public holiday)
 */
export function isSchoolDay(date) {
  const dow = date.getDay(); // 0=Sun, 6=Sat
  if (dow === 0 || dow === 6) return false;
  if (isPublicHoliday(date)) return false;
  return getTermForDate(date) !== null;
}

/**
 * Get all weeks in a given term, each as { weekStart, weekType, term }
 */
export function getTermWeeks(termNumber) {
  const term = NSW_TERMS_2026.find((t) => t.term === termNumber);
  if (!term) return [];
  const weeks = [];
  let current = startOfWeek(parseISO(term.start), { weekStartsOn: 1 });
  const termEnd = parseISO(term.end);
  while (current <= termEnd) {
    weeks.push({
      weekStart: current,
      weekType: getWeekType(current),
      term: termNumber,
    });
    current = addDays(current, 7);
  }
  return weeks;
}

/**
 * Day name from Date object (school days only)
 */
export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function getDayName(date) {
  const dow = date.getDay();
  // dow: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
  return DAY_NAMES[dow - 1] || null;
}