import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EditAssignmentDialog({ open, onOpenChange, members, workers, onSave, onDelete }) {
  const [subject, setSubject] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [slsoId, setSlsoId] = useState("");

  useEffect(() => {
    if (open && members?.length > 0) {
      const first = members[0];
      setSubject(first.subject || "");
      setRoomNumber(first.room_number || "");
      setNotes(first.notes || "");
      setSlsoId(first.slso_id || "none");
    }
  }, [open, members]);

  const handleSave = () => {
    const worker = workers.find((w) => w.id === slsoId) || null;
    onSave(members.map((m) => ({
      id: m.id,
      subject: subject.trim(),
      room_number: roomNumber.trim(),
      notes: notes.trim(),
      slso_id: worker?.id || "",
      slso_name: worker?.name || "",
    })));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Assignment</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1">
          {members?.map((m) => m.student_name).join(", ")}
        </p>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>SLSO</Label>
            <Select value={slsoId} onValueChange={setSlsoId}>
              <SelectTrigger>
                <SelectValue placeholder="Select SLSO…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No SLSO</span>
                </SelectItem>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: w.color || "#4F46E5" }} />
                      {w.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input placeholder="e.g. English…" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Room</Label>
              <Input placeholder="e.g. 101…" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="e.g. Funded support…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-16"
            />
          </div>
        </div>

        <DialogFooter>
          {onDelete && (
            <Button variant="destructive" className="mr-auto" onClick={() => { onDelete(members.map((m) => m.id)); onOpenChange(false); }}>
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}