import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function StudentForm({ open, onOpenChange, student, onSave }) {
  const [name, setName] = useState("");
  const [yearGroup, setYearGroup] = useState("");
  const [notes, setNotes] = useState("");
  const [isFunded, setIsFunded] = useState(false);
  const [fundedLessons, setFundedLessons] = useState("");

  useEffect(() => {
    if (student) {
      setName(student.name || "");
      setYearGroup(student.year_group || "");
      setNotes(student.notes || "");
      setIsFunded(student.is_funded || false);
      setFundedLessons(student.funded_lessons_per_week ?? "");
    } else {
      setName("");
      setYearGroup("");
      setNotes("");
      setIsFunded(false);
      setFundedLessons("");
    }
  }, [student, open]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      year_group: yearGroup.trim(),
      notes: notes.trim(),
      is_funded: isFunded,
      funded_lessons_per_week: isFunded && fundedLessons !== "" ? Number(fundedLessons) : null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{student ? "Edit Student" : "Add Student"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Year Group</Label>
            <Input placeholder="e.g. 7, 10, 12" value={yearGroup} onChange={(e) => setYearGroup(e.target.value)} />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_funded"
              checked={isFunded}
              onChange={(e) => setIsFunded(e.target.checked)}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            <Label htmlFor="is_funded" className="cursor-pointer">Funded support</Label>
          </div>

          {isFunded && (
            <div className="space-y-2">
              <Label>Funded lessons per week</Label>
              <Input
                type="number"
                min={1}
                max={20}
                placeholder="e.g. 3"
                value={fundedLessons}
                onChange={(e) => setFundedLessons(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Any additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} className="h-20" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {student ? "Update" : "Add Student"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}