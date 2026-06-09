import { useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";

const CLASS_GROUP_HEIGHT = 28; // px per student row
const MIN_ROW_HEIGHT = 56;    // minimum height for an SLSO row

function groupByClass(students) {
  const map = {};
  students.forEach((a) => {
    const key = `${a.subject || ""}__${a.room_number || ""}`;
    if (!map[key]) map[key] = { subject: a.subject, room_number: a.room_number, members: [] };
    map[key].members.push(a);
  });
  return Object.values(map);
}

function getRowHeight(students) {
  // header for each class group (14px) + each student row (24px) + padding
  const classes = groupByClass(students);
  const headerCount = classes.filter(c => c.subject || c.room_number).length;
  const total = students.length * 24 + headerCount * 14 + 20;
  return Math.max(MIN_ROW_HEIGHT, total);
}

export default function SchedulerCell({
  day,
  period,
  assignments,
  availableWorkers,
  onAddClick,
  onRemove,
}) {
  const [hoveredWorker, setHoveredWorker] = useState(null);

  const grouped = availableWorkers.map((worker) => ({
    worker,
    students: assignments.filter((a) => a.slso_id === worker.id),
  }));

  const unassigned = assignments.filter(
    (a) => !a.slso_id || !availableWorkers.find((w) => w.id === a.slso_id)
  );

  if (availableWorkers.length === 0) {
    return (
      <div className="border-r border-border last:border-r-0 p-2 min-h-[90px] bg-muted/20 flex items-center justify-center">
        <span className="text-xs text-muted-foreground/40">Off</span>
      </div>
    );
  }

  return (
    <div className="border-r border-border last:border-r-0 min-h-[90px] flex divide-x divide-border">
      {/* Left: SLSO names — each row height matches its student droppable */}
      <div className="w-[44%] flex flex-col">
        {grouped.map(({ worker, students }, i) => {
          const rowH = getRowHeight(students);
          return (
            <div
              key={worker.id}
              className={cn(
                "flex items-center gap-2 px-2 py-2 bg-muted/10",
                i < grouped.length - 1 ? "border-b border-border/60" : ""
              )}
              style={{ height: `${rowH}px` }}
              onMouseEnter={() => setHoveredWorker(worker.id)}
              onMouseLeave={() => setHoveredWorker(null)}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: worker.color || "#4F46E5" }}
              />
              <span className="text-xs font-semibold text-foreground leading-tight flex-1 break-words min-w-0">
                 {worker.name}
              </span>
              {(hoveredWorker === worker.id || students.length === 0) && (
                <button
                  onClick={() => onAddClick(worker)}
                  className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Right: Class groups (droppable per SLSO) — same heights as left */}
      <div className="flex-1 flex flex-col">
        {grouped.map(({ worker, students }, i) => {
          const droppableId = `${day}__${period}__${worker.id}`;
          const classes = groupByClass(students);
          const rowH = getRowHeight(students);

          return (
            <Droppable droppableId={droppableId} key={worker.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "flex flex-col gap-1 px-2 py-1.5 transition-colors",
                    snapshot.isDraggingOver ? "bg-primary/8" : "",
                    i < grouped.length - 1 ? "border-b border-border/60" : ""
                  )}
                  style={{ height: `${rowH}px` }}
                >
                  {classes.map((cls, index) => {
                    const draggableId = cls.members.map((m) => m.id).join("|");
                    return (
                      <Draggable key={draggableId} draggableId={draggableId} index={index}>
                        {(drag, dragSnapshot) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            {...drag.dragHandleProps}
                            className={cn(
                              "flex flex-col gap-0.5 rounded px-2 py-1 text-xs cursor-grab active:cursor-grabbing",
                              dragSnapshot.isDragging
                                ? "bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/40"
                                : "bg-muted/60 hover:bg-muted text-foreground"
                            )}
                          >
                            {(cls.subject || cls.room_number) && (
                              <div className={cn(
                                "text-[10px] font-semibold leading-tight",
                                dragSnapshot.isDragging ? "opacity-80" : "text-muted-foreground"
                              )}>
                                {cls.subject && <span>{cls.subject}</span>}
                                {cls.subject && cls.room_number && <span> · </span>}
                                {cls.room_number && <span>Rm {cls.room_number}</span>}
                              </div>
                            )}
                            {cls.members.map((a) => (
                              <div key={a.id} className="flex items-center justify-between gap-1">
                                <span className="break-words min-w-0 flex-1 font-medium">{a.student_name}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); onRemove(a.id); }}
                                  className={cn(
                                    "flex-shrink-0 transition-colors",
                                    dragSnapshot.isDragging
                                      ? "text-primary-foreground/70 hover:text-primary-foreground"
                                      : "text-muted-foreground/50 hover:text-destructive"
                                  )}
                                >
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

        {unassigned.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-1 px-2 py-1.5 bg-amber-50/50 border-t border-border/60">
            <span className="text-xs text-amber-700 truncate flex-1">{a.student_name}</span>
            <button onClick={() => onRemove(a.id)} className="text-muted-foreground/50 hover:text-destructive transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}