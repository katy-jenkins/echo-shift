import { useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, X, Bookmark } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import EditAssignmentDialog from "@/components/calendar/EditAssignmentDialog";
import AssignStudentDialog from "@/components/scheduler/AssignStudentDialog";

function groupByClass(slots) {
  const map = {};
  slots.forEach((s) => {
    const key = `${s.slso_id || ""}__${s.subject || ""}__${s.room_number || ""}`;
    if (!map[key]) {
      map[key] = {
        slso_id: s.slso_id,
        slso_name: s.slso_name,
        subject: s.subject,
        room_number: s.room_number,
        members: [],
      };
    }
    map[key].members.push(s);
  });
  return Object.values(map);
}

export default function CalendarDayCell({
  dateStr,
  period,
  schoolDay,
  isToday,
  templateSlots,
  bookings,
  availableWorkers,
  absences = [],
  allWorkers = [],
  onAddBooking,
  onDeleteBooking,
  onEditAssignment,
  onDeleteAssignment,
  onAddAssignment,
  allStudents = [],
  dayName,
  weekType,
  readOnlyAssignments = false,
}) {
  const [editingGroup, setEditingGroup] = useState(null);
  const [addingWorker, setAddingWorker] = useState(null);

  if (!schoolDay) {
    return (
      <div className="border-r border-border last:border-r-0 p-2 min-h-[80px] bg-muted/30" />
    );
  }

  return (
    <div
      className={cn(
        "border-r border-border last:border-r-0 p-1.5 min-h-[80px] flex flex-col gap-1",
        isToday ? "bg-primary/[0.02]" : "bg-card"
      )}
    >
      {/* Per-SLSO droppable rows — skip workers on excursion */}
      {availableWorkers.map((worker) => {
        const workerSlots = templateSlots.filter((s) => s.slso_id === worker.id);
        const classes = groupByClass(workerSlots);
        const droppableId = `cal__${dateStr}__${period}__${worker.id}`;
        const absence = absences.find((a) => a.worker_id === worker.id);
        const isExcursion = absence?.leave_type === "excursion";
        // Excursion workers are hidden from the normal grid; their students appear as extras below
        if (isExcursion) return null;
        const cover = absence?.cover_worker_id && absence.cover_worker_id !== "none"
          ? allWorkers.find((w) => w.id === absence.cover_worker_id)
          : null;

        if (readOnlyAssignments) {
          return (
            <div key={worker.id} className="rounded-md border border-border/60 bg-muted/40 text-[10px] leading-tight min-h-[24px]">
              {/* Worker header */}
              <div className="flex items-center gap-1 px-1.5 pt-1 pb-0.5">
                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", absence ? "opacity-40" : "")} style={{ backgroundColor: worker.color || "#4F46E5" }} />
                <span className={cn("break-words min-w-0 text-muted-foreground", absence ? "line-through opacity-40" : "")}>{worker.name}</span>
              </div>
              {absence && (
                <div className="flex items-center gap-1 mx-1.5 mb-0.5 text-[9px] bg-amber-50 border border-amber-200 rounded px-1 py-0.5">
                  <span className="text-amber-700 font-semibold">Cover:</span>
                  {cover ? (
                    <><span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cover.color || "#4F46E5" }} /><span className="text-amber-800 truncate">{cover.name}</span></>
                  ) : (
                    <span className="text-amber-600 italic">TBD</span>
                  )}
                </div>
              )}
              <div className="px-1.5 pb-1 space-y-0.5">
                {classes.map((cls, index) => (
                  <div key={index} className="rounded px-1.5 py-1 bg-card border border-border/40">
                    {(cls.subject || cls.room_number) && (
                      <div className="text-[9px] font-semibold mb-0.5 text-muted-foreground">
                        {cls.subject}{cls.subject && cls.room_number ? " · " : ""}{cls.room_number ? `Rm ${cls.room_number}` : ""}
                      </div>
                    )}
                    {cls.members.map((s) => (
                      <div key={s.id} className="font-medium break-words">{s.student_name}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <Droppable droppableId={droppableId} key={worker.id}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "rounded-md border text-[10px] leading-tight min-h-[24px] transition-colors",
                  snapshot.isDraggingOver ? "border-primary/40 bg-primary/5" : "border-border/60 bg-muted/40"
                )}
              >
                {/* Worker header */}
                <div className="flex items-center gap-1 px-1.5 pt-1 pb-0.5">
                  <span
                    className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", absence ? "opacity-40" : "")}
                    style={{ backgroundColor: worker.color || "#4F46E5" }}
                  />
                  <span className={cn("break-words min-w-0 text-muted-foreground", absence ? "line-through opacity-40" : "")}>
                    {worker.name}
                  </span>
                </div>

                {/* Absence/cover badge */}
                {absence && (
                  <div className="flex items-center gap-1 mx-1.5 mb-0.5 text-[9px] bg-amber-50 border border-amber-200 rounded px-1 py-0.5">
                    <span className="text-amber-700 font-semibold">Cover:</span>
                    {cover ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cover.color || "#4F46E5" }} />
                        <span className="text-amber-800 truncate">{cover.name}</span>
                      </>
                    ) : (
                      <span className="text-amber-600 italic">TBD</span>
                    )}
                  </div>
                )}

                {/* Draggable class groups */}
                <div className="px-1.5 pb-1 space-y-0.5">
                  {classes.map((cls, index) => {
                    const draggableId = cls.members.map((m) => m.id).join("|");
                    return (
                      <Draggable key={draggableId} draggableId={draggableId} index={index}>
                        {(drag, dragSnapshot) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            {...drag.dragHandleProps}
                            onClick={(e) => { if (!dragSnapshot.isDragging) { e.stopPropagation(); setEditingGroup(cls.members); } }}
                            className={cn(
                              "rounded px-1.5 py-1 cursor-grab active:cursor-grabbing",
                              dragSnapshot.isDragging
                                ? "bg-primary text-primary-foreground shadow-lg"
                                : "bg-card border border-border/40 hover:border-primary/40 hover:bg-primary/5"
                            )}
                          >
                            {(cls.subject || cls.room_number) && (
                              <div className={cn("text-[9px] font-semibold mb-0.5", dragSnapshot.isDragging ? "opacity-80" : "text-muted-foreground")}>
                                {cls.subject}{cls.subject && cls.room_number ? " · " : ""}{cls.room_number ? `Rm ${cls.room_number}` : ""}
                              </div>
                            )}
                            {cls.members.map((s) => (
                               <div key={s.id} className="font-medium break-words">{s.student_name}</div>
                             ))}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        );
      })}

      {/* Unassigned template slots (no slso_id, slso not in availableWorkers, or slso on excursion) */}
      {!readOnlyAssignments && (() => {
        const excursionWorkerIds = new Set(
          absences.filter((a) => a.leave_type === "excursion").map((a) => a.worker_id)
        );
        const extras = templateSlots.filter(
          (s) => !s.slso_id || !availableWorkers.find((w) => w.id === s.slso_id) || excursionWorkerIds.has(s.slso_id)
        );
        if (extras.length === 0) return null;
        return (
          <Droppable droppableId={`cal__${dateStr}__${period}__unassigned`}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "rounded-md border border-amber-200 bg-amber-50/40 px-1.5 py-1 text-[10px] space-y-0.5 min-h-[24px] transition-colors",
                  snapshot.isDraggingOver ? "border-primary/40 bg-primary/5" : ""
                )}
              >
                <div className="text-[9px] text-amber-600 font-semibold mb-0.5 uppercase tracking-wide">Extras</div>
                {extras.map((s, index) => {
                  const isExcursionStudent = excursionWorkerIds.has(s.slso_id);
                  return (
                    <Draggable key={s.id} draggableId={s.id} index={index}>
                      {(drag, dragSnapshot) => (
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          {...drag.dragHandleProps}
                          className={cn(
                            "font-medium break-words rounded px-1 py-0.5 cursor-grab active:cursor-grabbing",
                            dragSnapshot.isDragging
                              ? "bg-primary text-primary-foreground shadow-lg"
                              : isExcursionStudent
                                ? "text-amber-800 bg-amber-100/60"
                                : "text-amber-800"
                          )}
                        >
                          {s.student_name}
                          {isExcursionStudent && s.slso_name && (
                            <span className="ml-1 text-[9px] opacity-60">({s.slso_name} on exc.)</span>
                          )}
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
      })()}

      {/* One-off bookings */}
      {bookings.map((booking) => {
        const slsoColor = booking.slso_id
          ? availableWorkers.find((w) => w.id === booking.slso_id)?.color
          : null;
        return (
          <div
            key={booking.id}
            className={cn(
              "rounded-md border px-1.5 py-1 text-[10px] leading-tight",
              booking.is_cancelled
                ? "border-destructive/30 bg-destructive/5 opacity-60 line-through"
                : "border-accent/40 bg-accent/10"
            )}
          >
            <div className="flex items-start justify-between gap-0.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <Bookmark className="w-2 h-2 text-accent flex-shrink-0" />
                  {slsoColor && (
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: slsoColor }} />
                  )}
                  {booking.slso_name && (
                    <span className="text-muted-foreground truncate">{booking.slso_name}</span>
                  )}
                </div>
                <div className="font-medium text-foreground break-words pl-2.5">{booking.student_name}</div>
                {booking.notes && (
                  <div className="text-muted-foreground/70 truncate mt-0.5 pl-2.5">{booking.notes}</div>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteBooking(booking.id); }}
                className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Workers with no assignments this period */}
      {!readOnlyAssignments && (() => {
        const assignedWorkerIds = new Set(templateSlots.map((s) => s.slso_id).filter(Boolean));
        const bookedWorkerIds = new Set(bookings.filter((b) => b.slso_id && !b.is_cancelled).map((b) => b.slso_id));
        const absentWorkerIds = new Set(absences.map((a) => a.worker_id));
        const idle = availableWorkers.filter(
          (w) => !assignedWorkerIds.has(w.id) && !bookedWorkerIds.has(w.id) && !absentWorkerIds.has(w.id)
        );
        if (idle.length === 0) return null;
        return (
          <div className="flex flex-col gap-0.5">
            {idle.map((w) => (
              <button
                key={w.id}
                onClick={() => setAddingWorker(w)}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-[9px] text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-colors w-full text-left"
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: w.color || "#4F46E5" }} />
                <span className="break-words min-w-0 font-medium">{w.name}</span>
                <span className="ml-auto italic opacity-70 flex items-center gap-0.5">
                  <Plus className="w-2.5 h-2.5" />free
                </span>
              </button>
            ))}
          </div>
        );
      })()}

      {/* Add one-off booking slot */}
      <button
        onClick={onAddBooking}
        className="mt-auto flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-accent border border-dashed border-border/40 hover:border-accent/40 rounded px-1.5 py-0.5 transition-colors"
      >
        <Plus className="w-2.5 h-2.5" />
        <span>One-off</span>
      </button>

      {!readOnlyAssignments && editingGroup && (
        <EditAssignmentDialog
          open={!!editingGroup}
          onOpenChange={(v) => !v && setEditingGroup(null)}
          members={editingGroup}
          workers={allWorkers}
          onSave={(updates) => { onEditAssignment(updates); setEditingGroup(null); }}
          onDelete={(ids) => { onDeleteAssignment(ids); setEditingGroup(null); }}
        />
      )}

      {!readOnlyAssignments && addingWorker && (
        <AssignStudentDialog
          open={!!addingWorker}
          onOpenChange={(v) => !v && setAddingWorker(null)}
          students={allStudents.filter((s) => !templateSlots.find((t) => t.student_id === s.id))}
          day={dayName}
          period={period}
          weekType={weekType}
          worker={addingWorker}
          onAdd={(studentsToAdd) => { onAddAssignment(studentsToAdd, addingWorker); setAddingWorker(null); }}
        />
      )}
    </div>
  );
}