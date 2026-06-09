import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PinGate from "@/components/PinGate";
import { format, addDays, subDays, startOfToday } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarX, ArrowRightLeft, Link2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const PUBLIC_TOKEN = "absences-readonly-2026";

const LEAVE_LABELS = {
  lwop: "LWOP",
  sick: "Sick",
  facs: "FACS",
};

const LEAVE_COLORS = {
  lwop: "bg-slate-50 text-slate-700 border-slate-200",
  sick: "bg-red-50 text-red-700 border-red-200",
  facs: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function AbsenceSummary() {
  const [copied, setCopied] = useState(false);
  const today = startOfToday();
  const in30Days = addDays(today, 30);
  const fortnight = subDays(today, 14);

  const { data: workers = [] } = useQuery({
    queryKey: ["workers"],
    queryFn: () => base44.entities.Worker.list(),
  });

  const { data: upcomingAbsences = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ["absences-upcoming"],
    queryFn: () =>
      base44.entities.Absence.filter({
        date: {
          $gte: format(today, "yyyy-MM-dd"),
          $lte: format(in30Days, "yyyy-MM-dd"),
        },
      }),
  });

  const { data: pastAbsences = [], isLoading: loadingPast } = useQuery({
    queryKey: ["absences-past"],
    queryFn: () =>
      base44.entities.Absence.filter({
        date: {
          $gte: format(fortnight, "yyyy-MM-dd"),
          $lt: format(today, "yyyy-MM-dd"),
        },
      }),
  });

  const getWorker = (id) => workers.find((w) => w.id === id);
  const getWorkerName = (id) => getWorker(id)?.name || "Unknown";

  const filteredUpcoming = upcomingAbsences.filter((a) => a.leave_type !== "excursion");
  const filteredPast = pastAbsences.filter((a) => a.leave_type !== "excursion");

  // Group upcoming absences by worker
  const upcomingByWorker = filteredUpcoming.reduce((acc, absence) => {
    const wid = absence.worker_id;
    if (!acc[wid]) acc[wid] = [];
    acc[wid].push(absence);
    return acc;
  }, {});

  // Sort each worker's absences by date
  Object.values(upcomingByWorker).forEach((list) =>
    list.sort((a, b) => new Date(a.date) - new Date(b.date))
  );

  // Sort past absences by date descending
  const sortedPast = [...filteredPast].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Sort workers by number of upcoming absences desc
  const sortedWorkerIds = Object.keys(upcomingByWorker).sort(
    (a, b) => upcomingByWorker[b].length - upcomingByWorker[a].length
  );

  return (
    <PinGate>
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Absence Summary</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upcoming 30 days &amp; past 14 days at a glance
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 self-start sm:self-auto"
          onClick={() => {
            const url = `${window.location.origin}/public-absences?token=${PUBLIC_TOKEN}`;
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Link2 className="w-4 h-4" />}
          {copied ? "Copied!" : "Copy share link"}
        </Button>
      </div>

      {/* Upcoming absences — grouped by worker */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Upcoming Absences</h2>
          <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">
            Next 30 days
          </span>
          {!loadingUpcoming && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {filteredUpcoming.length} absence{filteredUpcoming.length !== 1 ? "s" : ""}
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
              <Card key={workerId} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
                    <AbsenceRow key={absence.id} absence={absence} getWorkerName={getWorkerName} />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Past absences — flat list */}
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
                  <div key={absence.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                     <div
                       className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                       style={{ backgroundColor: worker?.color || "#4F46E5" }}
                     >
                       {worker?.name?.charAt(0)?.toUpperCase() || "?"}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-semibold text-foreground truncate">
                         {worker?.name || "Unknown"}
                       </p>
                       <p className="text-xs text-muted-foreground">
                         {format(new Date(absence.date), "EEE d MMM yyyy")}
                       </p>
                       {absence.cover_worker_id && absence.cover_worker_id !== "none" && (
                         <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                           <ArrowRightLeft className="w-3 h-3" />
                           <span>Covered by {getWorkerName(absence.cover_worker_id)}</span>
                         </div>
                       )}
                     </div>
                     <Badge
                       variant="outline"
                       className={cn("text-xs flex-shrink-0", LEAVE_COLORS[absence.leave_type])}
                     >
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
    </PinGate>
  );
}

function AbsenceRow({ absence, getWorkerName }) {
  return (
    <div className={cn("rounded-lg border px-3 py-2", LEAVE_COLORS[absence.leave_type])}>
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