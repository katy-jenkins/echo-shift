import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function BookingDialog({ open, onOpenChange, date, period, students, workers, existing, onSave, onDelete }) {
  const [mode, setMode] = useState("student"); // "student" | "freetext"
  const [studentId, setStudentId] = useState("");
  const [freeText, setFreeText] = useState("");
  const [slsoId, setSlsoId] = useState("none");
  const [notes, setNotes] = useState("");
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    if (existing) {
      // If the existing student_id looks like a freetext id, switch to freetext mode
      const isFree = existing.student_id?.startsWith("freetext-");
      setMode(isFree ? "freetext" : "student");
      setStudentId(isFree ? "" : (existing.student_id || ""));
      setFreeText(isFree ? (existing.student_name || "") : "");
      setSlsoId(existing.slso_id || "none");
      setNotes(existing.notes || "");
      setIsCancelled(existing.is_cancelled || false);
    } else {
      setMode("student");
      setStudentId("");
      setFreeText("");
      setSlsoId("none");
      setNotes("");
      setIsCancelled(false);
    }
  }, [existing, open]);

  const canSubmit = mode === "freetext" ? freeText.trim().length > 0 : !!studentId;

  const handleSave = () => {
    if (!canSubmit) return;
    const worker = workers.find((w) => w.id === slsoId) || null;
    if (mode === "freetext") {
      onSave({
        date,
        period,
        student_id: `freetext-${existing?.student_id?.startsWith("freetext-") ? existing.student_id.slice(9) : Date.now()}`,
        student_name: freeText.trim(),
        slso_id: worker?.id || "",
        slso_name: worker?.name || "",
        notes: notes.trim(),
        is_cancelled: isCancelled,
      });
    } else {
      const student = students.find((s) => s.id === studentId);
      onSave({
        date,
        period,
        student_id: studentId,
        student_name: student?.name || "",
        slso_id: worker?.id || "",
        slso_name: worker?.name || "",
        notes: notes.trim(),
        is_cancelled: isCancelled,
      });
    }
  };

  const displayDate = (() => {
    try { return format(new Date(date + "T00:00:00"), "EEEE d MMMM yyyy"); }
    catch { return date; }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Booking" : "Add One-off Booking"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1">{displayDate} · Period {period}</p>

        <div className="space-y-4 py-2">
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

          {mode === "student" ? (
            <div className="space-y-2">
              <Label>Student *</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student…" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.year_group ? ` (Yr ${s.year_group})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Label *</Label>
              <Input
                placeholder="e.g. Exam support, Library duty…"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>SLSO</Label>
            <Select value={slsoId} onValueChange={setSlsoId}>
              <SelectTrigger>
                <SelectValue placeholder="Assign SLSO…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No SLSO</span>
                </SelectItem>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: w.color || "#4F46E5" }}
                      />
                      {w.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="e.g. Make-up session, exam support…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-16"
            />
          </div>

          {existing && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_cancelled"
                checked={isCancelled}
                onChange={(e) => setIsCancelled(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-destructive"
              />
              <Label htmlFor="is_cancelled" className="cursor-pointer text-destructive">Mark as cancelled</Label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {existing && (
            <Button variant="destructive" onClick={() => { onDelete(existing.id); onOpenChange(false); }} className="mr-auto">
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSubmit}>
            {existing ? "Update" : "Add Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}