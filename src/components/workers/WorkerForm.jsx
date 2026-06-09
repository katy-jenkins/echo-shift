import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
];

const COLORS = [
  "#4F46E5", "#7C3AED", "#DB2777", "#DC2626",
  "#EA580C", "#CA8A04", "#16A34A", "#0891B2",
  "#2563EB", "#6D28D9",
];

export default function WorkerForm({ open, onOpenChange, worker, onSave }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [workDays, setWorkDays] = useState([1, 2, 3, 4, 5]);
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (worker) {
      setName(worker.name);
      setRole("SLSO");
      setWorkDays(worker.work_days || [1, 2, 3, 4, 5]);
      setColor(worker.color || COLORS[0]);
    } else {
      setName("");
      setRole("SLSO");
      setWorkDays([1, 2, 3, 4, 5]);
      setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    }
  }, [worker, open]);

  const toggleDay = (dayValue) => {
    setWorkDays((prev) =>
      prev.includes(dayValue) ? prev.filter((d) => d !== dayValue) : [...prev, dayValue]
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), role: role.trim(), work_days: workDays, color });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{worker ? "Edit Worker" : "Add Worker"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Input
              placeholder="SLSO"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label>Regular Work Days</Label>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    "w-11 h-11 rounded-lg text-xs font-semibold transition-all border",
                    workDays.includes(day.value)
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {worker ? "Update" : "Add Worker"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}