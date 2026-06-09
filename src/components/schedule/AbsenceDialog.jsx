import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

const LEAVE_TYPES = [
  { value: "lwop", label: "LWOP" },
  { value: "sick", label: "Sick" },
  { value: "facs", label: "FACS" },
  { value: "excursion", label: "Excursion" },
  { value: "extended_leave", label: "Extended Leave" },
  { value: "other", label: "Other" },
];

export default function AbsenceDialog({ open, onOpenChange, worker, date, workers, absences = [], existingAbsence, onSave, onDelete }) {
  const [leaveType, setLeaveType] = useState("annual_leave");
  const [coverWorkerId, setCoverWorkerId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existingAbsence) {
      setLeaveType(existingAbsence.leave_type);
      setCoverWorkerId(existingAbsence.cover_worker_id || "");
      setNotes(existingAbsence.notes || "");
    } else {
      setLeaveType("lwop");
      setCoverWorkerId("");
      setNotes("");
    }
  }, [existingAbsence, open]);

  const availableCovers = (workers || []).filter((w) => {
    if (!worker || w.id === worker.id) return false;
    // Must be scheduled to work on this day (if work_days is not set, assume all days)
    if (date && w.work_days && w.work_days.length > 0) {
      const dayNum = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      if (!w.work_days.includes(dayNum)) return false;
    }
    // Must not already be absent on this day
    if (date) {
      const dateStr = format(date, "yyyy-MM-dd");
      const alreadyAbsent = absences.some(
        (a) => a.worker_id === w.id && a.date === dateStr && a.id !== existingAbsence?.id
      );
      if (alreadyAbsent) return false;
    }
    return true;
  });

  const handleSave = () => {
    onSave({
      worker_id: worker.id,
      date: format(date, "yyyy-MM-dd"),
      leave_type: leaveType,
      cover_worker_id: coverWorkerId || undefined,
      notes: notes || undefined,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (existingAbsence) {
      onDelete(existingAbsence.id);
      onOpenChange(false);
    }
  };

  if (!worker || !date) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {existingAbsence ? "Edit Absence" : "Mark Absence"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {worker.name} — {format(date, "EEEE, d MMMM yyyy")}
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Leave Type</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((lt) => (
                  <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {leaveType !== "excursion" && <div className="space-y-2">
            <Label className="text-sm font-medium">Covered By</Label>
            <Select value={coverWorkerId} onValueChange={setCoverWorkerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select cover (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No cover</SelectItem>
                {availableCovers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {existingAbsence && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-1" /> Remove
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              {existingAbsence ? "Update" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}