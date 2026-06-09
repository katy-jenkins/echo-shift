import { format, addDays, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { UserX, ArrowRightLeft, Bus } from "lucide-react";
import { motion } from "framer-motion";

const LEAVE_LABELS = {
  lwop: "LWOP",
  sick: "Sick",
  facs: "FACS",
  excursion: "Excursion",
  extended_leave: "Ext. Leave",
  other: "Other",
};

const LEAVE_COLORS = {
  lwop: "bg-slate-50 border-slate-200 text-slate-700",
  sick: "bg-red-50 border-red-200 text-red-700",
  facs: "bg-blue-50 border-blue-200 text-blue-700",
  excursion: "bg-green-50 border-green-200 text-green-700",
  extended_leave: "bg-purple-50 border-purple-200 text-purple-700",
  other: "bg-orange-50 border-orange-200 text-orange-700",
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function WeeklyCalendar({ weekStart, workers, absences, onCellClick }) {
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const getAbsence = (workerId, date) =>
    absences.find(
      (a) => a.worker_id === workerId && isSameDay(new Date(a.date), date)
    );

  const getWorkerName = (id) => workers.find((w) => w.id === id)?.name || "";

  const isWorkDay = (worker, dayIndex) => {
    const dayNum = (dayIndex + 1) % 7; // Convert Mon=0..Sun=6 to Sun=0..Sat=6
    return worker.work_days?.includes(dayNum);
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="grid border-b border-border" style={{ gridTemplateColumns: "180px repeat(5, 1fr)" }}>
        <div className="p-3 bg-muted/50 border-r border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Worker</span>
        </div>
        {weekDays.map((day, i) => (
          <div
            key={i}
            className={cn(
              "p-3 text-center border-r border-border last:border-r-0",
              isToday(day) ? "bg-primary/5" : "bg-muted/50"
            )}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase">{DAY_NAMES[i]}</p>
            <p className={cn(
              "text-sm font-bold mt-0.5",
              isToday(day) ? "text-primary" : "text-foreground"
            )}>
              {format(day, "d")}
            </p>
          </div>
        ))}
      </div>

      {/* Worker rows */}
      {workers.length === 0 && (
        <div className="p-12 text-center text-muted-foreground text-sm">
          No workers added yet. Go to Workers to add some.
        </div>
      )}
      {workers.map((worker) => (
        <motion.div
          key={worker.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid border-b border-border last:border-b-0"
          style={{ gridTemplateColumns: "180px repeat(5, 1fr)" }}
        >
          <div className="p-3 border-r border-border flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: worker.color || "hsl(234, 89%, 60%)" }}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{worker.name}</p>
              {worker.role && <p className="text-xs text-muted-foreground truncate">{worker.role}</p>}
            </div>
          </div>

          {weekDays.map((day, dayIdx) => {
            const workDay = isWorkDay(worker, dayIdx);
            const absence = getAbsence(worker.id, day);

            return (
              <div
                key={dayIdx}
                onClick={() => workDay && onCellClick(worker, day, absence)}
                className={cn(
                  "p-2 border-r border-border last:border-r-0 min-h-[64px] flex items-center justify-center transition-all",
                  isToday(day) && "bg-primary/[0.02]",
                  workDay
                    ? "cursor-pointer hover:bg-muted/60"
                    : "bg-muted/30"
                )}
              >
                {!workDay && (
                  <span className="text-xs text-muted-foreground/40 font-medium">Off</span>
                )}
                {workDay && !absence && (
                  <span className="text-xs text-green-600/70 font-medium">Working</span>
                )}
                {workDay && absence && (
                  <div className={cn("w-full rounded-md border px-2 py-1.5 text-center", LEAVE_COLORS[absence.leave_type])}>
                    <div className="flex items-center justify-center gap-1">
                      {absence.leave_type === "excursion"
                        ? <Bus className="w-3 h-3" />
                        : <UserX className="w-3 h-3" />
                      }
                      <span className="text-xs font-semibold">{LEAVE_LABELS[absence.leave_type]}</span>
                    </div>
                    {absence.cover_worker_id && absence.cover_worker_id !== "none" && absence.leave_type !== "excursion" && (
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <ArrowRightLeft className="w-2.5 h-2.5 opacity-60" />
                        <span className="text-[10px] opacity-80">{getWorkerName(absence.cover_worker_id)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>
      ))}
    </div>
  );
}