import { useState, useMemo } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ShieldAlert, CalendarDays, LayoutGrid, Plus, X } from "lucide-react";
import { addDays, format, startOfWeek, isToday } from "date-fns";
import {
  NSW_TERMS_2026,
  getTermWeeks,
  isSchoolDay,
  DAY_NAMES,
} from "@/lib/termDates";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import AssignStudentDialog from "@/components/scheduler/AssignStudentDialog";

const VALID_TOKEN = "slso2026";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [1, 2, 3, 4];
const DAY_TO_NUM = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };

export default function PublicSchedule() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (token !== VALID_TOKEN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground">Invalid or missing access token.</p>
        </div>
      </div>
    );
  }

  return <ScheduleView />;
}

function ScheduleView() {
  const [activeTab, setActiveTab] = useState("calendar"); // "calendar" | "scheduler"

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">SLSO Schedule</h1>
          <p className="text-xs text-muted-foreground">Read-only view</p>
        </div>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("calendar")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
              activeTab === "calendar" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Term Calendar
          </button>
          <button
            onClick={() => setActiveTab("scheduler")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
              activeTab === "scheduler" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Support Scheduler
          </button>
        </div>
        <Badge variant="outline" className="text-xs text-muted-foreground">Calendar: read-only · Scheduler: editable</Badge>
      </div>

      <div className="p-4">
        {activeTab === "calendar" ? <ReadOnlyCalendar /> : <EditableScheduler />}
      </div>
    </div>
  );
}

/* ─── Read-only Term Calendar ─── */
function ReadOnlyCalendar() {
  const today = new Date();
  const [currentTerm, setCurrentTerm] = useState(() => {
    for (const t of NSW_TERMS_2026) {
      const d = format(today, "yyyy-MM-dd");
      if (d >= t.start && d <= t.end) return t.term;
    }
    return 2;
  });
  const termWeeks = useMemo(() => getTermWeeks(currentTerm), [currentTerm]);
  const [weekIndex, setWeekIndex] = useState(() => {
    const weeks = getTermWeeks(currentTerm);
    const todayMon = startOfWeek(today, { weekStartsOn: 1 });
    const idx = weeks.findIndex((w) => format(w.weekStart, "yyyy-MM-dd") === format(todayMon, "yyyy-MM-dd"));
    return idx >= 0 ? idx : 0;
  });
  const currentWeek = termWeeks[weekIndex];
  const weekDates = currentWeek ? Array.from({ length: 5 }, (_, i) => addDays(currentWeek.weekStart, i)) : [];
  const weekDateStrings = weekDates.map((d) => format(d, "yyyy-MM-dd"));

  const { data: workers = [] } = useQuery({
    queryKey: ["workers-pub"],
    queryFn: async () => {
      const { data, error } = await supabase.from("worker").select("*");
      if (error) throw error;
      return [...(data ?? [])].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));
    },
  });
  const { data: assignmentsA = [] } = useQuery({
    queryKey: ["assignments-pub-A"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assignment").select("*").eq("week_type", "A");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: assignmentsB = [] } = useQuery({
    queryKey: ["assignments-pub-B"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assignment").select("*").eq("week_type", "B");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: absences = [] } = useQuery({
    queryKey: ["absences-pub", weekDateStrings[0]],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("absence")
        .select("*")
        .gte("date", weekDateStrings[0])
        .lte("date", weekDateStrings[4]);
      if (error) throw error;
      return data ?? [];
    },
    enabled: weekDateStrings.length > 0,
  });
  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings-pub", weekDateStrings[0]],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking")
        .select("*")
        .gte("date", weekDateStrings[0])
        .lte("date", weekDateStrings[4]);
      if (error) throw error;
      return data ?? [];
    },
    enabled: weekDateStrings.length > 0,
  });

  const getTemplateAssignments = (dayName, period) => {
    const src = currentWeek?.weekType === "A" ? assignmentsA : assignmentsB;
    return src.filter((a) => a.day === dayName && a.period === period);
  };
  const getBookingsForCell = (dateStr, period) => bookings.filter((b) => b.date === dateStr && b.period === period);

  return (
    <div className="space-y-4">
      {/* Term + week nav */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          {NSW_TERMS_2026.map((t) => (
            <button key={t.term} onClick={() => { setCurrentTerm(t.term); setWeekIndex(0); }}
              className={cn("px-3 py-1 rounded-md text-xs font-semibold transition-all",
                currentTerm === t.term ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              T{t.term}
            </button>
          ))}
        </div>
        {currentWeek && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekIndex((i) => Math.max(0, i - 1))} disabled={weekIndex === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center text-sm">
              <span className="font-semibold">{format(currentWeek.weekStart, "d MMM")} – {format(addDays(currentWeek.weekStart, 4), "d MMM yyyy")}</span>
              <span className={cn("ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full",
                currentWeek.weekType === "A" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent")}>
                Week {currentWeek.weekType}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekIndex((i) => Math.min(termWeeks.length - 1, i + 1))} disabled={weekIndex === termWeeks.length - 1}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {currentWeek && (
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid border border-border rounded-t-xl overflow-hidden bg-muted/50"
              style={{ gridTemplateColumns: "60px repeat(5, 200px)" }}>
              <div className="p-2 border-r border-border" />
              {weekDates.map((date, i) => {
                const today_ = isToday(date);
                const schoolDay = isSchoolDay(date);
                return (
                  <div key={i} className={cn("p-2 text-center border-r border-border last:border-r-0", today_ ? "bg-primary/5" : "", !schoolDay ? "bg-muted/60" : "")}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">{DAY_NAMES[i].slice(0, 3)}</p>
                    <p className={cn("text-sm font-bold", today_ ? "text-primary" : "text-foreground")}>{format(date, "d")}</p>
                    {!schoolDay && <p className="text-[10px] text-muted-foreground/60">No school</p>}
                  </div>
                );
              })}
            </div>

            {/* Period rows */}
            {PERIODS.map((period) => (
              <div key={period} className="grid border-l border-r border-b border-border last:rounded-b-xl"
                style={{ gridTemplateColumns: "60px repeat(5, 200px)" }}>
                <div className="p-2 border-r border-border flex items-center justify-center bg-muted/30">
                  <span className="text-sm font-bold text-muted-foreground">{period}</span>
                </div>
                {weekDates.map((date, i) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  const dayName = DAY_NAMES[i];
                  const schoolDay = isSchoolDay(date);
                  if (!schoolDay) return <div key={dateStr} className="border-r border-border last:border-r-0 bg-muted/30 min-h-[70px]" />;

                  const slots = getTemplateAssignments(dayName, period);
                  const cellBookings = getBookingsForCell(dateStr, period);
                  const dayAbsences = absences.filter((a) => a.date === dateStr);

                  // group slots by worker
                  const excursionWorkerIds = new Set(
                    dayAbsences.filter((a) => a.leave_type === "excursion").map((a) => a.worker_id)
                  );

                  const byWorker = {};
                  slots.forEach((s) => {
                    if (!byWorker[s.slso_id || "__none__"]) byWorker[s.slso_id || "__none__"] = { slso_name: s.slso_name, members: [] };
                    byWorker[s.slso_id || "__none__"].members.push(s);
                  });

                  const extraSlots = slots.filter((s) => s.slso_id && excursionWorkerIds.has(s.slso_id));

                  return (
                    <div key={dateStr} className="border-r border-border last:border-r-0 p-1.5 min-h-[70px] flex flex-col gap-1 bg-card">
                      {Object.entries(byWorker)
                        .filter(([slsoId]) => !excursionWorkerIds.has(slsoId))
                        .map(([slsoId, group]) => {
                        const absence = slsoId !== "__none__" ? dayAbsences.find((a) => a.worker_id === slsoId) : null;
                        const cover = absence?.cover_worker_id && absence.cover_worker_id !== "none"
                          ? workers.find((w) => w.id === absence.cover_worker_id) : null;
                        const worker = workers.find((w) => w.id === slsoId);
                        return (
                          <div key={slsoId} className={cn("rounded-md border text-[10px] leading-tight px-1.5 py-1",
                            absence ? "border-amber-300 bg-amber-50/60" : "border-border/60 bg-muted/40")}>
                            <div className="flex items-center gap-1 mb-0.5">
                              {worker?.color && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: worker.color }} />}
                              <span className={cn("text-muted-foreground break-words min-w-0", absence ? "line-through opacity-40" : "")}>{group.slso_name}</span>
                              {absence && (
                                <span className="ml-1 text-amber-700 font-semibold text-[9px]">→ {cover ? cover.name : "TBD"}</span>
                              )}
                            </div>
                            {group.members.map((s) => (
                              <div key={s.id} className="font-medium text-foreground break-words pl-2">{s.student_name}</div>
                            ))}
                          </div>
                        );
                      })}
                      {extraSlots.length > 0 && (
                        <div className="rounded-md border border-amber-200 bg-amber-50/40 px-1.5 py-1 text-[10px] space-y-0.5">
                          <div className="text-[9px] text-amber-600 font-semibold uppercase tracking-wide">Extras</div>
                          {extraSlots.map((s) => (
                            <div key={s.id} className="font-medium text-amber-800 break-words">
                              {s.student_name}
                              {s.slso_name && <span className="ml-1 opacity-60 text-[9px]">({s.slso_name} on exc.)</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {cellBookings.map((b) => (
                        <div key={b.id} className={cn("rounded-md border px-1.5 py-1 text-[10px]",
                          b.is_cancelled ? "border-destructive/30 bg-destructive/5 opacity-60 line-through" : "border-accent/40 bg-accent/10")}>
                          {b.slso_name && <div className="text-muted-foreground mb-0.5">{b.slso_name}</div>}
                          <div className="font-medium break-words">{b.student_name}</div>
                          {b.notes && <div className="text-muted-foreground/70 mt-0.5">{b.notes}</div>}
                        </div>
                      ))}
                      {Object.keys(byWorker).length === 0 && cellBookings.length === 0 && (
                        <span className="text-[9px] text-muted-foreground/40 italic">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Editable Support Scheduler ─── */
function EditableScheduler() {
  const [weekType, setWeekType] = useState("A");
  const [addingCell, setAddingCell] = useState(null);
  const queryClient = useQueryClient();

  const { data: workers = [] } = useQuery({
    queryKey: ["workers-pub"],
    queryFn: async () => {
      const { data, error } = await supabase.from("worker").select("*");
      if (error) throw error;
      return [...(data ?? [])].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));
    },
  });
  const { data: students = [] } = useQuery({
    queryKey: ["students-pub"],
    queryFn: async () => {
      const { data, error } = await supabase.from("student").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["assignments-pub-sched", weekType],
    queryFn: async () => {
      const { data, error } = await supabase.from("assignment").select("*").eq("week_type", weekType);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createAssignment = useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase.from("assignment").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments-pub-sched"] }),
  });
  const updateAssignment = useMutation({
    mutationFn: async ({ id, data: values }) => {
      const { data, error } = await supabase.from("assignment").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments-pub-sched"] }),
  });
  const deleteAssignment = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("assignment").delete().eq("id", id);
      if (error) throw error;
      return { id };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments-pub-sched"] }),
  });

  const getCellAssignments = (day, period) => assignments.filter((a) => a.day === day && a.period === period && a.period !== 0);
  const getAvailableWorkers = (day) => workers.filter((w) => w.work_days?.includes(DAY_TO_NUM[day]));
  const getUnassignedStudents = (day, period) => {
    const assigned = getCellAssignments(day, period).map((a) => a.student_id);
    return students.filter((s) => !assigned.includes(s.id));
  };

  const handleAddStudents = (studentsToAdd) => {
    const { day, period, worker } = addingCell;
    studentsToAdd.forEach(({ studentId, studentName, subject, roomNumber, notes }) => {
      createAssignment.mutate({ week_type: weekType, day, period, student_id: studentId, student_name: studentName,
        slso_id: worker?.id || "", slso_name: worker?.name || "", subject: subject || "", room_number: roomNumber || "", notes: notes || "" });
    });
    setAddingCell(null);
  };

  const handleDragEnd = (result) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const [destDay, destPeriod, destWorkerId] = destination.droppableId.split("__");
    const destWorker = workers.find((w) => w.id === destWorkerId);
    if (!destWorker) return;
    draggableId.split("|").forEach((id) => {
      updateAssignment.mutate({ id, data: { day: destDay, period: Number(destPeriod), slso_id: destWorker.id, slso_name: destWorker.name } });
    });
  };

  function groupByClass(slots) {
    const map = {};
    slots.forEach((s) => {
      const key = `${s.slso_id || ""}__${s.subject || ""}__${s.room_number || ""}`;
      if (!map[key]) map[key] = { slso_id: s.slso_id, slso_name: s.slso_name, subject: s.subject, room_number: s.room_number, members: [] };
      map[key].members.push(s);
    });
    return Object.values(map);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-muted p-1 rounded-lg w-fit">
        {["A", "B"].map((w) => (
          <button key={w} onClick={() => setWeekType(w)}
            className={cn("px-4 py-1.5 rounded-md text-sm font-semibold transition-all",
              weekType === w ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            Week {w}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="overflow-x-auto">
            <div style={{ minWidth: "1100px" }}>
              <div className="grid border-2 border-border rounded-t-xl overflow-hidden bg-muted/50"
                style={{ gridTemplateColumns: "70px repeat(5, 200px)" }}>
                <div className="p-3 border-r border-border flex items-center justify-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">P</span>
                </div>
                {DAYS.map((day) => (
                  <div key={day} className="p-3 text-center border-r border-border last:border-r-0">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{day}</span>
                  </div>
                ))}
              </div>

              {PERIODS.map((period) => (
                <div key={period} className="grid border-l border-r border-b-2 border-border last:rounded-b-xl"
                  style={{ gridTemplateColumns: "70px repeat(5, 200px)" }}>
                  <div className="p-3 border-r-2 border-border flex items-center justify-center bg-muted/40">
                    <span className="text-sm font-bold text-foreground">{period}</span>
                  </div>
                  {DAYS.map((day) => {
                    const slots = getCellAssignments(day, period);
                    const avail = getAvailableWorkers(day);

                    if (avail.length === 0) {
                      return (
                        <div key={day} className="border-r border-border last:border-r-0 p-2 min-h-[90px] bg-muted/20 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground/40">Off</span>
                        </div>
                      );
                    }

                    return (
                      <div key={day} className="border-r border-border last:border-r-0 min-h-[90px] flex divide-x divide-border">
                        <div className="w-[44%] flex flex-col">
                          {avail.map((worker, i) => {
                            const workerSlots = slots.filter((s) => s.slso_id === worker.id);
                            const rowH = Math.max(40, workerSlots.length * 22 + 20);
                            return (
                              <div key={worker.id}
                                className={cn("flex items-center gap-1.5 px-2 py-2 bg-muted/10 cursor-pointer hover:bg-primary/5 transition-colors",
                                  i < avail.length - 1 ? "border-b border-border/60" : "")}
                                style={{ height: `${rowH}px` }}
                                onClick={() => setAddingCell({ day, period, worker })}>
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: worker.color || "#4F46E5" }} />
                                <span className="text-xs font-semibold text-foreground break-words min-w-0 flex-1">{worker.name}</span>
                                <Plus className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex-1 flex flex-col">
                          {avail.map((worker, i) => {
                            const workerSlots = slots.filter((s) => s.slso_id === worker.id);
                            const classes = groupByClass(workerSlots);
                            const droppableId = `${day}__${period}__${worker.id}`;
                            const rowH = Math.max(40, workerSlots.length * 22 + 20);
                            return (
                              <Droppable droppableId={droppableId} key={worker.id}>
                                {(provided, snapshot) => (
                                  <div ref={provided.innerRef} {...provided.droppableProps}
                                    className={cn("flex flex-col gap-1 px-2 py-1.5 transition-colors",
                                      snapshot.isDraggingOver ? "bg-primary/8" : "",
                                      i < avail.length - 1 ? "border-b border-border/60" : "")}
                                    style={{ height: `${rowH}px` }}>
                                    {classes.map((cls, idx) => {
                                      const draggableId = cls.members.map((m) => m.id).join("|");
                                      return (
                                        <Draggable key={draggableId} draggableId={draggableId} index={idx}>
                                          {(drag, dragSnapshot) => (
                                            <div ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps}
                                              className={cn("rounded px-1.5 py-1 text-xs cursor-grab active:cursor-grabbing",
                                                dragSnapshot.isDragging ? "bg-primary text-primary-foreground shadow-lg" : "bg-muted/60 hover:bg-muted text-foreground")}>
                                              {(cls.subject || cls.room_number) && (
                                                <div className={cn("text-[10px] font-semibold mb-0.5", dragSnapshot.isDragging ? "opacity-80" : "text-muted-foreground")}>
                                                  {cls.subject}{cls.subject && cls.room_number ? " · " : ""}{cls.room_number ? `Rm ${cls.room_number}` : ""}
                                                </div>
                                              )}
                                              {cls.members.map((a) => (
                                                <div key={a.id} className="flex items-center justify-between gap-1">
                                                  <span className="break-words min-w-0 flex-1 font-medium">{a.student_name}</span>
                                                  <button onClick={(e) => { e.stopPropagation(); deleteAssignment.mutate(a.id); }}
                                                    className={cn("flex-shrink-0 transition-colors", dragSnapshot.isDragging ? "text-primary-foreground/70" : "text-muted-foreground/50 hover:text-destructive")}>
                                                    <X className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </Draggable>
                                      );
                                    })}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </DragDropContext>
      )}

      {addingCell && (
        <AssignStudentDialog
          open={!!addingCell}
          onOpenChange={(v) => !v && setAddingCell(null)}
          students={getUnassignedStudents(addingCell.day, addingCell.period)}
          day={addingCell.day}
          period={addingCell.period}
          weekType={weekType}
          worker={addingCell.worker}
          onAdd={handleAddStudents}
        />
      )}
    </div>
  );
}