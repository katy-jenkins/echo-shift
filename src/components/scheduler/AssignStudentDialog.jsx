import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export default function AssignStudentDialog({ open, onOpenChange, students, day, period, weekType, worker, onAdd }) {
  const [mode, setMode] = useState("student"); // "student" | "freetext"
  const [subject, setSubject] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [freeText, setFreeText] = useState("");

  const reset = () => {
    setSubject("");
    setRoomNumber("");
    setNotes("");
    setSelectedIds([]);
    setFreeText("");
    setMode("student");
  };

  const toggleStudent = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAdd = () => {
    if (mode === "freetext") {
      if (!freeText.trim()) return;
      onAdd([{ studentId: `freetext-${Date.now()}`, studentName: freeText.trim(), subject, roomNumber, notes }]);
    } else {
      if (selectedIds.length === 0) return;
      const studentsToAdd = selectedIds
        .map((id) => students.find((s) => s.id === id))
        .filter(Boolean)
        .map((student) => ({ studentId: student.id, studentName: student.name, subject, roomNumber, notes }));
      onAdd(studentsToAdd);
    }
    reset();
  };

  const handleClose = (v) => {
    onOpenChange(v);
    if (!v) reset();
  };

  const canSubmit = mode === "freetext" ? freeText.trim().length > 0 : selectedIds.length > 0;

  // Filter students to same year group once one is selected, sorted by year
  const firstSelected = students.find((s) => selectedIds.includes(s.id));
  const filteredStudents = (firstSelected?.year_group
    ? students.filter((s) => selectedIds.includes(s.id) || s.year_group === firstSelected.year_group)
    : students
  ).sort((a, b) => {
    // Put selected students at top
    const aSelected = selectedIds.includes(a.id);
    const bSelected = selectedIds.includes(b.id);
    if (aSelected !== bSelected) return bSelected ? 1 : -1;
    // Then sort by year
    return (a.year_group || "").localeCompare(b.year_group || "");
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Students to Slot</DialogTitle>
        </DialogHeader>

        <div className="-mt-1 space-y-0.5">
          <p className="text-sm text-muted-foreground">
            Week {weekType} · {day} · Period {period}
          </p>
          {worker && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: worker.color || "#4F46E5" }} />
              <p className="text-sm font-medium text-foreground">with {worker.name}</p>
            </div>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          {[{ id: "student", label: "Select Student" }, { id: "freetext", label: "Free Text" }].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                "flex-1 py-1 rounded-md text-xs font-semibold transition-all",
                mode === m.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="space-y-4 py-2">
          {/* Subject & Room */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input
                placeholder="e.g. English…"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Room</Label>
              <Input
                placeholder="e.g. 101…"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
              />
            </div>
          </div>

          {mode === "freetext" ? (
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                placeholder="e.g. Exam support, Library duty…"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
              />
            </div>
          ) : (
            /* Students multi-select */
            <div className="space-y-1.5">
              <Label>Students</Label>
              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground">All students are already assigned to this slot.</p>
              ) : (
                <div className="border border-border rounded-lg divide-y divide-border max-h-52 overflow-y-auto">
                  {filteredStudents.map((s) => {
                    const selected = selectedIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStudent(s.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors text-left",
                          selected ? "bg-primary/8 text-primary" : "hover:bg-muted text-foreground"
                        )}
                      >
                        <span>
                          {s.name}
                          {s.year_group ? <span className="text-muted-foreground ml-1 text-xs">Yr {s.year_group}</span> : null}
                        </span>
                        {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedIds.length > 0 && (
                <p className="text-xs text-muted-foreground">{selectedIds.length} student{selectedIds.length > 1 ? "s" : ""} selected</p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
           <Label>Notes (optional)</Label>
           <Textarea
             placeholder="e.g. Funded support, exam preparation…"
             value={notes}
             onChange={(e) => setNotes(e.target.value)}
             className="h-16"
           />
          </div>
          </div>

          <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!canSubmit}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}