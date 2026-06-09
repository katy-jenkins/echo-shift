import { useState } from "react";
import { base44 } from "@/api/base44Client";
import PinGate from "@/components/PinGate";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { startOfWeek, format, addDays } from "date-fns";
import WeekNavigator from "@/components/schedule/WeekNavigator";
import WeeklyCalendar from "@/components/schedule/WeeklyCalendar";
import AbsenceDialog from "@/components/schedule/AbsenceDialog";

export default function Schedule() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAbsence, setSelectedAbsence] = useState(null);

  const queryClient = useQueryClient();

  const { data: workers = [] } = useQuery({
    queryKey: ["workers"],
    queryFn: async () => {
      const list = await base44.entities.Worker.list();
      return [...list].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));
    },
  });

  const weekEndDate = addDays(weekStart, 6);
  const weekKey = format(weekStart, "yyyy-MM-dd");

  const { data: absences = [] } = useQuery({
    queryKey: ["absences", weekKey],
    queryFn: () =>
      base44.entities.Absence.filter({
        date: {
          $gte: format(weekStart, "yyyy-MM-dd"),
          $lte: format(weekEndDate, "yyyy-MM-dd"),
        },
      }),
  });

  const createAbsence = useMutation({
    mutationFn: (data) => base44.entities.Absence.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["absences"] }),
  });

  const updateAbsence = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Absence.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["absences"] }),
  });

  const deleteAbsence = useMutation({
    mutationFn: (id) => base44.entities.Absence.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["absences"] }),
  });

  const handleCellClick = (worker, date, absence) => {
    setSelectedWorker(worker);
    setSelectedDate(date);
    setSelectedAbsence(absence || null);
    setDialogOpen(true);
  };

  const handleSave = (data) => {
    if (selectedAbsence) {
      updateAbsence.mutate({ id: selectedAbsence.id, data });
    } else {
      createAbsence.mutate(data);
    }
  };

  const handleDelete = (id) => {
    deleteAbsence.mutate(id);
  };

  return (
    <PinGate>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Weekly Schedule</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Click on a work day to mark an absence</p>
        </div>
        <WeekNavigator currentWeekStart={weekStart} onWeekChange={setWeekStart} />
      </div>

      <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
        <div className="min-w-[800px]">
          <WeeklyCalendar
            weekStart={weekStart}
            workers={workers}
            absences={absences}
            onCellClick={handleCellClick}
          />
        </div>
      </div>

      <AbsenceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        worker={selectedWorker}
        date={selectedDate}
        workers={workers}
        absences={absences}
        existingAbsence={selectedAbsence}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
    </PinGate>
  );
}