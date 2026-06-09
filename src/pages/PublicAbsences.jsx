import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, subDays, startOfToday } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarX, ArrowRightLeft, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const VALID_TOKEN = "absences-readonly-2026";

const LEAVE_LABELS = { lwop: "LWOP", sick: "Sick", facs: "FACS" };
const LEAVE_COLORS = {
  lwop: "bg-slate-50 text-slate-700 border-slate-200",
  sick: "bg-red-50 text-red-700 border-red-200",
  facs: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function PublicAbsences() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (token !== VALID_TOKEN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground">Invalid or missing access token.</p>
        </div>
      </div>
    );
  }

  return <AbsencesView />;
}

function AbsencesView() {
  const today = startOfToday();
  const in30Days = addDays(today, 30);
  const fortnight = subDays(today, 14);

  const { data: workers = [] } = useQuery({
    queryKey: ["workers-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("worker").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: upcomingAbsences = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ["absences-upcoming-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("absence")
        .select("*")
        .gte("date", format(today, "yyyy-MM-dd"))
        .lte("date", format(in30Days, "yyyy-MM-dd"));
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pastAbsences = [], isLoading: loadingPast } = useQuery({
    queryKey: ["absences-past-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("absence")
        .select("*")
        .gte("date", format(fortnight, "yyyy-MM-dd"))
        .lt("date", format(today, "yyyy-MM-dd"));
      if (error) throw error;
      return data ?? [];
    },
  });

  const getWorker = (id) => workers.find((w) => w.id === id);
  const getWorkerName = (id) => getWorker(id)?.name || "Unknown";

  const upcomingByWorker = upcomingAbsences.reduce((acc, absence) => {
    if (!acc[absence.worker_id]) acc[absence.worker_id] = [];
    acc[absence.worker_id].push(absence);
    return acc;
  }, {});
  Object.values(upcomingByWorker).forEach((list) =>
    list.sort((a, b) => new Date(a.date) - new Date(b.date))
  );
  const sortedWorkerIds = Object.keys(upcomingByWorker).sort(
    (a, b) => upcomingByWorker[b].length - upcomingByWorker[a].length
  );
  const sortedPast = [...pastAbsences].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Absence Summary</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upcoming 30 days &amp; past 14 days · Read-only view · Updated live
          </p>
        </div>
        <Badge variant="outline" className="text-xs text-muted-foreground mt-1">
          🔒 Read only
        </Badge>
      </div>

      {/* Upcoming */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Upcoming Absences</h2>
          <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">
            Next 30 days
          </span>
          {!loadingUpcoming && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {upcomingAbsences.length} absence{upcomingAbsences.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {loadingUpcoming && <LoadingRows />}
        {!loadingUpcoming && sortedWorkerIds.length === 0 && (
          <EmptyState message="No upcoming absences in the next 30 days." />
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedWorkerIds.map((workerId) => {
            const worker = getWorker(workerId);
            const absences = upcomingByWorker[workerId];
            return (
              <Card key={workerId} className="overflow-hidden shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: worker?.color || "#4F46E5" }}
                    >
                      {worker?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">{worker?.name || "Unknown"}</CardTitle>
                      {worker?.role && <p className="text-xs text-muted-foreground truncate">{worker.role}</p>}
                    </div>
                    <Badge className="ml-auto text-xs flex-shrink-0" variant="secondary">
                      {absences.length} day{absences.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-2 space-y-2">
                  {absences.map((absence) => (
                    <div key={absence.id} className={cn("rounded-lg border px-3 py-2", LEAVE_COLORS[absence.leave_type])}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold">{LEAVE_LABELS[absence.leave_type]}</span>
                        <span className="text-xs opacity-80">{format(new Date(absence.date), "EEE d MMM")}</span>
                      </div>
                      {absence.cover_worker_id && absence.cover_worker_id !== "none" ? (
                        <div className="flex items-center gap-1 opacity-70">
                          <ArrowRightLeft className="w-2.5 h-2.5" />
                          <span className="text-[11px]">Covered by {getWorkerName(absence.cover_worker_id)}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] opacity-50 italic">No cover assigned</div>
                      )}
                      {absence.notes && (
                        <p className="text-[11px] mt-1 opacity-70 truncate">{absence.notes}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Recent */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Recent Absences</h2>
          <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">
            Past 14 days
          </span>
          {!loadingPast && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {sortedPast.length} absence{sortedPast.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {loadingPast && <LoadingRows />}
        {!loadingPast && sortedPast.length === 0 && (
          <EmptyState message="No absences recorded in the past 14 days." />
        )}

        {!loadingPast && sortedPast.length > 0 && (
          <Card className="shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              {sortedPast.map((absence) => {
                const worker = getWorker(absence.worker_id);
                return (
                  <div key={absence.id} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                      style={{ backgroundColor: worker?.color || "#4F46E5" }}
                    >
                      {worker?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{worker?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(absence.date), "EEE d MMM yyyy")}</p>
                      {absence.cover_worker_id && absence.cover_worker_id !== "none" && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>Covered by {getWorkerName(absence.cover_worker_id)}</span>
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className={cn("text-xs flex-shrink-0", LEAVE_COLORS[absence.leave_type])}>
                      {LEAVE_LABELS[absence.leave_type]}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center bg-muted/30 rounded-xl border border-dashed border-border">
      <CalendarX className="w-8 h-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}