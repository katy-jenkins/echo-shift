import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, format, startOfWeek, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  NSW_TERMS_2026,
  getWeekType,
  getTermForDate,
  isSchoolDay,
  getTermWeeks,
  getDayName,
  DAY_NAMES,
} from "@/lib/termDates";
import CalendarDayCell from "@/components/calendar/CalendarDayCell";
import BookingDialog from "@/components/calendar/BookingDialog";
import DayDetailPanel from "@/components/calendar/DayDetailPanel";

const PERIODS = [1, 2, 3, 4];

export default function TermCalendar() {
  const today = new Date();
  const [currentTerm, setCurrentTerm] = useState(() => {
    for (const t of NSW_TERMS_2026) {
      const d = format(today, "yyyy-MM-dd");
      if (d >= t.start && d <= t.end) return t.term;
    }
    return 2; // default to term 2
  });

  const [bookingDialog, setBookingDialog] = useState(null); // { date, period, existing? }
  const [selectedDay, setSelectedDay] = useState(null); // { date, dateStr, dayName } for side panel
  const queryClient = useQueryClient();

  // Determine which weeks are in view (current term)
  const termWeeks = useMemo(() => getTermWeeks(currentTerm), [currentTerm]);

  // Navigate to the week containing today if in this term
  const [weekIndex, setWeekIndex] = useState(() => {
    const weeks = getTermWeeks(currentTerm);
    const todayMon = startOfWeek(today, { weekStartsOn: 1 });
    const idx = weeks.findIndex((w) => format(w.weekStart, "yyyy-MM-dd") === format(todayMon, "yyyy-MM-dd"));
    return idx >= 0 ? idx : 0;
  });

  const currentWeek = termWeeks[weekIndex];

  const { data: workers = [] } = useQuery({
    queryKey: ["workers"],
    queryFn: async () => {
      const list = await base44.entities.Worker.list();
      return [...list].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list(),
  });

  // Load ALL assignments for both week types (they're templates)
  const { data: assignmentsA = [] } = useQuery({
    queryKey: ["assignments", "A"],
    queryFn: () => base44.entities.Assignment.filter({ week_type: "A" }),
  });

  const { data: assignmentsB = [] } = useQuery({
    queryKey: ["assignments", "B"],
    queryFn: () => base44.entities.Assignment.filter({ week_type: "B" }),
  });

  // Load bookings for current week
  const weekDates = currentWeek
    ? Array.from({ length: 5 }, (_, i) => addDays(currentWeek.weekStart, i))
    : [];

  const weekDateStrings = weekDates.map((d) => format(d, "yyyy-MM-dd"));

  // Load absences for current week
  const { data: absences = [] } = useQuery({
    queryKey: ["absences", weekDateStrings[0]],
    queryFn: () =>
      base44.entities.Absence.filter({
        date: { $gte: weekDateStrings[0], $lte: weekDateStrings[4] },
      }),
    enabled: weekDateStrings.length > 0,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings", weekDateStrings[0]],
    queryFn: () =>
      base44.entities.Booking.filter({
        date: { $gte: weekDateStrings[0], $lte: weekDateStrings[4] },
      }),
    enabled: weekDateStrings.length > 0,
  });

  const createBooking = useMutation({
    mutationFn: (data) => base44.entities.Booking.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const updateBooking = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const deleteBooking = useMutation({
    mutationFn: (id) => base44.entities.Booking.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const getTemplateAssignments = (dayName, period) => {
    const src = currentWeek?.weekType === "A" ? assignmentsA : assignmentsB;
    return src.filter((a) => a.day === dayName && a.period === period);
  };

  const getBookingsForCell = (dateStr, period) =>
    bookings.filter((b) => b.date === dateStr && b.period === period);

  const getAvailableWorkers = (dayName) => {
    const DAY_TO_NUM = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };
    return workers.filter((w) => w.work_days?.includes(DAY_TO_NUM[dayName]));
  };

  const handleCellClick = (date, period) => {
    setBookingDialog({ date, period });
  };

  const handleDayClick = (date, dateStr, dayName) => {
    if (!isSchoolDay(date)) return;
    setSelectedDay({ date, dateStr, dayName });
  };

  const handleSaveBooking = (data) => {
    if (bookingDialog?.existing) {
      updateBooking.mutate({ id: bookingDialog.existing.id, data });
    } else {
      createBooking.mutate(data);
    }
    setBookingDialog(null);
  };

  const handlePanelAddBooking = (data) => {
    createBooking.mutate(data);
  };

  const handlePanelEditBooking = (id, data) => {
    updateBooking.mutate({ id, data });
  };

  const handleDeleteBooking = (id) => {
    deleteBooking.mutate(id);
  };

  const termLabel = `Term ${currentTerm} 2026`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Term Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Weekly view with A/B schedule and one-off bookings
          </p>
        </div>
        {/* Term selector */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          {NSW_TERMS_2026.map((t) => (
            <button
              key={t.term}
              onClick={() => { setCurrentTerm(t.term); setWeekIndex(0); }}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-semibold transition-all",
                currentTerm === t.term
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              T{t.term}
            </button>
          ))}
        </div>
      </div>

      {/* Week navigator */}
      {currentWeek && (
        <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
            disabled={weekIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="text-center">
            <div className="flex items-center gap-2 justify-center">
              <span className="text-sm font-semibold text-foreground">
                {format(currentWeek.weekStart, "d MMM")} – {format(addDays(currentWeek.weekStart, 4), "d MMM yyyy")}
              </span>
              <span className={cn(
                "text-xs font-bold px-2 py-0.5 rounded-full",
                currentWeek.weekType === "A"
                  ? "bg-primary/10 text-primary"
                  : "bg-accent/10 text-accent"
              )}>
                Week {currentWeek.weekType}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {termLabel} · Week {weekIndex + 1} of {termWeeks.length}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekIndex((i) => Math.min(termWeeks.length - 1, i + 1))}
            disabled={weekIndex === termWeeks.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Grid */}
      {currentWeek && (
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <div className="min-w-[800px]">
            {/* Day headers */}
            <div
              className="grid border border-border rounded-t-xl overflow-hidden bg-muted/50"
              style={{ gridTemplateColumns: "72px repeat(5, 200px)" }}
            >
              <div className="p-3 border-r border-border" />
              {weekDates.map((date, i) => {
                const schoolDay = isSchoolDay(date);
                const today_ = isToday(date);
                const dateStr = format(date, "yyyy-MM-dd");
                const dayName = DAY_NAMES[i];
                return (
                  <div
                    key={i}
                    onClick={() => handleDayClick(date, dateStr, dayName)}
                    className={cn(
                      "p-3 text-center border-r border-border last:border-r-0 transition-colors",
                      schoolDay ? "cursor-pointer hover:bg-primary/10" : "cursor-default",
                      today_ ? "bg-primary/5" : "",
                      !schoolDay ? "bg-muted/60" : ""
                    )}
                  >
                    <p className="text-xs font-semibold text-muted-foreground uppercase">{DAY_NAMES[i].slice(0, 3)}</p>
                    <p className={cn("text-sm font-bold", today_ ? "text-primary" : "text-foreground")}>
                      {format(date, "d")}
                    </p>
                    {!schoolDay && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">No school</p>
                    )}
                    {schoolDay && (
                      <p className="text-[10px] text-muted-foreground/40 mt-0.5">tap to manage</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Period rows */}
            {PERIODS.map((period) => (
              <div
                key={period}
                className="grid border-l border-r border-b border-border last:rounded-b-xl"
                style={{ gridTemplateColumns: "72px repeat(5, 200px)" }}
              >
                <div className="p-3 border-r border-border flex items-center justify-center bg-muted/30">
                  <span className="text-sm font-bold text-muted-foreground">{period}</span>
                </div>

                {weekDates.map((date, i) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  const dayName = DAY_NAMES[i];
                  const schoolDay = isSchoolDay(date);
                  const templateSlots = schoolDay ? getTemplateAssignments(dayName, period) : [];
                  const cellBookings = schoolDay ? getBookingsForCell(dateStr, period) : [];
                  const avail = getAvailableWorkers(dayName);

                  const dayAbsences = absences.filter((a) => a.date === dateStr);

                  return (
                    <CalendarDayCell
                      key={dateStr}
                      date={date}
                      dateStr={dateStr}
                      period={period}
                      dayName={dayName}
                      weekType={currentWeek?.weekType}
                      schoolDay={schoolDay}
                      isToday={isToday(date)}
                      templateSlots={templateSlots}
                      bookings={cellBookings}
                      availableWorkers={avail}
                      absences={dayAbsences}
                      allWorkers={workers}
                      allStudents={students}
                      readOnlyAssignments={true}
                      onAddBooking={() => handleCellClick(dateStr, period)}
                      onDeleteBooking={handleDeleteBooking}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day detail panel */}
      {selectedDay && (
        <DayDetailPanel
          date={selectedDay.date}
          dateStr={selectedDay.dateStr}
          dayName={selectedDay.dayName}
          availableWorkers={getAvailableWorkers(selectedDay.dayName)}
          getTemplateAssignments={getTemplateAssignments}
          getBookingsForCell={getBookingsForCell}
          allStudents={students}
          absences={absences.filter((a) => a.date === selectedDay.dateStr)}
          allWorkers={workers}
          onAddBooking={handlePanelAddBooking}
          onEditBooking={handlePanelEditBooking}
          onDeleteBooking={handleDeleteBooking}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* Booking dialog */}
      {bookingDialog && (
        <BookingDialog
          open={!!bookingDialog}
          onOpenChange={(v) => !v && setBookingDialog(null)}
          date={bookingDialog.date}
          period={bookingDialog.period}
          students={students}
          workers={workers.filter((w) => {
            // filter by day availability
            const dayIdx = new Date(bookingDialog.date + "T00:00:00").getDay(); // 0=Sun..6=Sat
            return w.work_days?.includes(dayIdx === 0 ? 0 : dayIdx);
          })}
          existing={bookingDialog.existing || null}
          onSave={handleSaveBooking}
          onDelete={handleDeleteBooking}
        />
      )}
    </div>
  );
}