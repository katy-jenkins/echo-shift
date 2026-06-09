import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { DragDropContext } from "@hello-pangea/dnd";
import SchedulerCell from "@/components/scheduler/SchedulerCell";
import AssignStudentDialog from "@/components/scheduler/AssignStudentDialog";
import FundedTally from "@/components/scheduler/FundedTally";
import RollCallRow from "@/components/scheduler/RollCallRow";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [1, 2, 3, 4];
const DAY_TO_NUM = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };

export default function SupportScheduler() {
  const [weekType, setWeekType] = useState("A");
  const [addingCell, setAddingCell] = useState(null); // { day, period, worker }
  const queryClient = useQueryClient();

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

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["assignments", weekType],
    queryFn: () => base44.entities.Assignment.filter({ week_type: weekType }),
  });

  const createAssignment = useMutation({
    mutationFn: (data) => base44.entities.Assignment.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments"] }),
  });

  const updateAssignment = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Assignment.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments"] }),
  });

  const deleteAssignment = useMutation({
    mutationFn: (id) => base44.entities.Assignment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments"] }),
  });

  const getCellAssignments = (day, period) =>
    assignments.filter((a) => a.day === day && a.period === period);

  const getAvailableWorkers = (day) => {
    const dayNum = DAY_TO_NUM[day];
    return workers.filter((w) => w.work_days?.includes(dayNum));
  };

  const handleAddStudents = (studentsToAdd) => {
    const { day, period, worker } = addingCell;
    studentsToAdd.forEach(({ studentId, studentName, subject, roomNumber, notes }) => {
      createAssignment.mutate({
        week_type: weekType,
        day,
        period,
        student_id: studentId,
        student_name: studentName,
        slso_id: worker?.id || "",
        slso_name: worker?.name || "",
        subject: subject || "",
        room_number: roomNumber || "",
        notes: notes || "",
      });
    });
    setAddingCell(null);
  };

  const handleRemoveAssignment = (assignmentId) => {
    deleteAssignment.mutate(assignmentId);
  };

  // droppableId format: "Day__Period__WorkerId"
  // draggableId may be pipe-separated IDs for a whole class group e.g. "id1|id2|id3"
  const handleDragEnd = (result) => {
    const { draggableId, destination } = result;
    if (!destination) return;

    const [destDay, destPeriod, destWorkerId] = destination.droppableId.split("__");
    const destWorker = workers.find((w) => w.id === destWorkerId);
    if (!destWorker) return;

    const ids = draggableId.split("|");
    ids.forEach((id) => {
      updateAssignment.mutate({
        id,
        data: {
          day: destDay,
          period: Number(destPeriod),
          slso_id: destWorker.id,
          slso_name: destWorker.name,
        },
      });
    });
  };

  const getUnassignedStudents = (day, period) => {
    const assigned = getCellAssignments(day, period).map((a) => a.student_id);
    return students.filter((s) => !assigned.includes(s.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Support Scheduler</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Assign students and SLSOs to weekly periods</p>
        </div>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          {["A", "B"].map((w) => (
            <button
              key={w}
              onClick={() => setWeekType(w)}
              className={cn(
                "px-5 py-1.5 rounded-md text-sm font-semibold transition-all",
                weekType === w
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Week {w}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && (
        <>
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
              <div style={{ minWidth: "1100px" }}>
                {/* Header */}
                <div
                  className="grid border-2 border-border rounded-t-xl overflow-hidden bg-muted/50"
                  style={{ gridTemplateColumns: "70px repeat(5, 200px)" }}
                >
                  <div className="p-3 border-r border-border flex items-center justify-center">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">P</span>
                  </div>
                  {DAYS.map((day) => (
                    <div key={day} className="p-3 text-center border-r border-border last:border-r-0">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{day}</span>
                    </div>
                  ))}
                </div>

                {/* Roll call row */}
                <RollCallRow weekType={weekType} />

                {/* Period rows */}
                {PERIODS.map((period) => (
                  <div
                    key={period}
                    className="grid border-l border-r border-b-2 border-border last:rounded-b-xl"
                    style={{ gridTemplateColumns: "70px repeat(5, 200px)" }}
                  >
                    <div className="p-3 border-r-2 border-border flex items-center justify-center bg-muted/40">
                      <span className="text-sm font-bold text-foreground">{period}</span>
                    </div>
                    {DAYS.map((day) => (
                      <SchedulerCell
                        key={day}
                        day={day}
                        period={period}
                        assignments={getCellAssignments(day, period)}
                        availableWorkers={getAvailableWorkers(day)}
                        onAddClick={(worker) => setAddingCell({ day, period, worker })}
                        onRemove={handleRemoveAssignment}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </DragDropContext>

          <FundedTally students={students} assignments={assignments} />
        </>
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