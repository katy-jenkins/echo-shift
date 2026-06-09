import { cn } from "@/lib/utils";

export default function FundedTally({ students, assignments }) {
  const funded = students.filter((s) => s.is_funded);
  if (funded.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-sm font-semibold text-foreground mb-3">Funded Student Lesson Tally</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {funded.map((student) => {
          // For each assignment this student is in, divide by the number of students sharing that slot
          const studentAssignments = assignments.filter((a) => a.student_id === student.id);
          const assigned = studentAssignments.length;
          const target = student.funded_lessons_per_week ?? 0;
          const pct = target > 0 ? Math.min(100, Math.round((assigned / target) * 100)) : 0;
          const over = target > 0 && assigned > target;
          const met = target > 0 && assigned >= target;

          return (
            <div key={student.id} className="flex flex-col gap-1.5 bg-muted/30 rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate">{student.name}</span>
                <span className={cn(
                  "text-xs font-semibold flex-shrink-0",
                  over ? "text-destructive" : met ? "text-green-600" : "text-amber-600"
                )}>
                  {Number.isInteger(assigned) ? assigned : assigned.toFixed(2).replace(/\.?0+$/, "")}/{target ?? "?"} lessons
                </span>
              </div>
              {target > 0 && (
                <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      over ? "bg-destructive" : met ? "bg-green-500" : "bg-amber-400"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
              {target === 0 && (
                <span className="text-[11px] text-muted-foreground">No target set</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}