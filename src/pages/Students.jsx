import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import StudentForm from "@/components/students/StudentForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Students() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteStudent, setDeleteStudent] = useState(null);
  const queryClient = useQueryClient();

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => base44.entities.Assignment.list(),
  });

  const createStudent = useMutation({
    mutationFn: (data) => base44.entities.Student.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });

  const updateStudent = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Student.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (id) => base44.entities.Student.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });

  const handleSave = (data) => {
    if (editingStudent) {
      updateStudent.mutate({ id: editingStudent.id, data });
    } else {
      createStudent.mutate(data);
    }
    setEditingStudent(null);
  };

  const scheduledCountForStudent = (studentId) => {
    const studentAssignments = assignments.filter((a) => a.student_id === studentId);
    // Count unique day+period combos per week type, then average
    const weekA = new Set(studentAssignments.filter(a => a.week_type === "A").map(a => `${a.day}-${a.period}`)).size;
    const weekB = new Set(studentAssignments.filter(a => a.week_type === "B").map(a => `${a.day}-${a.period}`)).size;
    return { weekA, weekB };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage student profiles and funded support</p>
        </div>
        <Button onClick={() => { setEditingStudent(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Student
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && students.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No students yet. Add your first student!</p>
          <Button className="mt-4" onClick={() => { setEditingStudent(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Student
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {students.map((student) => {
          const { weekA, weekB } = scheduledCountForStudent(student.id);
          const funded = student.funded_lessons_per_week ?? 0;
          return (
            <Card key={student.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{student.name}</p>
                    {student.year_group && (
                      <p className="text-xs text-muted-foreground">Year {student.year_group}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingStudent(student); setFormOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteStudent(student)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {student.is_funded && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">Funded</Badge>
                    {funded > 0 && (
                      <span className="text-xs text-muted-foreground">{funded} lessons/week</span>
                    )}
                  </div>
                )}
                {(weekA > 0 || weekB > 0) && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    {weekA > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center bg-primary/10 text-primary">A</span>
                        <span>{weekA} lesson{weekA !== 1 ? "s" : ""} scheduled</span>
                        {student.is_funded && funded > 0 && (
                          <span className={weekA >= funded ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                            ({weekA >= funded ? "✓ met" : `${funded - weekA} short`})
                          </span>
                        )}
                      </div>
                    )}
                    {weekB > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center bg-accent/10 text-accent">B</span>
                        <span>{weekB} lesson{weekB !== 1 ? "s" : ""} scheduled</span>
                        {student.is_funded && funded > 0 && (
                          <span className={weekB >= funded ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                            ({weekB >= funded ? "✓ met" : `${funded - weekB} short`})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {student.notes && (
                  <p className="text-xs text-muted-foreground italic truncate">{student.notes}</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <StudentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        student={editingStudent}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteStudent} onOpenChange={() => setDeleteStudent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteStudent?.name}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { deleteStudentMutation.mutate(deleteStudent.id); setDeleteStudent(null); }}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}