import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// We store roll call notes as a special Assignment with period=0 and student_id="roll-call"
export default function RollCallRow({ weekType }) {
  const queryClient = useQueryClient();

  const { data: rollCalls = [] } = useQuery({
    queryKey: ["roll-call", weekType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment")
        .select("*")
        .eq("week_type", weekType)
        .eq("period", 0)
        .eq("student_id", "roll-call");
      if (error) throw error;
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async ({ day, notes }) => {
      const existing = rollCalls.find((r) => r.day === day);
      if (existing) {
        const { data, error } = await supabase
          .from("assignment")
          .update({ notes })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("assignment")
          .insert({
            week_type: weekType,
            day,
            period: 0,
            student_id: "roll-call",
            student_name: "Roll Call",
            notes,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roll-call", weekType] }),
  });

  return (
    <div
      className="grid border-l border-r border-b border-border bg-amber-50/40"
      style={{ gridTemplateColumns: "70px repeat(5, 1fr)" }}
    >
      <div className="p-3 border-r-2 border-border flex items-center justify-center bg-amber-100/60">
        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider text-center leading-tight">Roll Call</span>
      </div>
      {DAYS.map((day) => {
        const existing = rollCalls.find((r) => r.day === day);
        return (
          <RollCallCell
            key={day}
            defaultValue={existing?.notes || ""}
            onBlur={(val) => {
              if (val !== (existing?.notes || "")) {
                upsert.mutate({ day, notes: val });
              }
            }}
          />
        );
      })}
    </div>
  );
}

function RollCallCell({ defaultValue, onBlur }) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  return (
    <div className="border-r border-border last:border-r-0 px-2 py-1.5">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onBlur(value)}
        placeholder="Notes…"
        rows={2}
        className="w-full text-xs text-foreground bg-transparent resize-none outline-none placeholder:text-muted-foreground/40 leading-relaxed"
      />
    </div>
  );
}