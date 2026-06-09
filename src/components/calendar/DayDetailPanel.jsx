import { useState, useRef } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { X, Plus, Bookmark, Edit2, Trash2, Printer, LayoutList, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BookingDialog from "@/components/calendar/BookingDialog";
import html2canvas from "html2canvas";

const PERIODS = [1, 2, 3, 4];

function groupByClass(slots) {
  const map = {};
  slots.forEach((s) => {
    const key = `${s.slso_id || ""}__${s.subject || ""}__${s.room_number || ""}`;
    if (!map[key]) map[key] = { slso_id: s.slso_id, slso_name: s.slso_name, subject: s.subject, room_number: s.room_number, members: [] };
    map[key].members.push(s);
  });
  return Object.values(map);
}

export default function DayDetailPanel({
  date,
  dateStr,
  dayName,
  availableWorkers,
  getTemplateAssignments,
  getBookingsForCell,
  allStudents,
  absences = [],
  allWorkers = [],
  onAddBooking,
  onEditBooking,
  onDeleteBooking,
  onClose,
}) {
  const [bookingDialog, setBookingDialog] = useState(null); // { period, existing? }
  const [printing, setPrinting] = useState(false);
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"
  const printRef = useRef(null);

  const handlePrint = async () => {
    if (!printRef.current) return;
    setPrinting(true);
    const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const dataUrl = canvas.toDataURL("image/png");
    const newTab = window.open();
    if (newTab) {
      newTab.document.write(`<html><head><title>Schedule ${dateStr}</title></head><body style="margin:0;background:#fff;display:flex;justify-content:center;"><img src="${dataUrl}" style="max-width:100%;height:auto;" /></body></html>`);
      newTab.document.close();
    }
    setPrinting(false);
  };

  const displayDate = (() => {
    try { return format(new Date(dateStr + "T00:00:00"), "EEEE d MMMM yyyy"); }
    catch { return dateStr; }
  })();

  const handleSave = (data) => {
    if (bookingDialog?.existing) {
      onEditBooking(bookingDialog.existing.id, data);
    } else {
      onAddBooking(data);
    }
    setBookingDialog(null);
  };

  const handleDelete = (id) => {
    onDeleteBooking(id);
    setBookingDialog(null);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border bg-muted/30 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground">{displayDate}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {availableWorkers.length > 0
                ? `${availableWorkers.length} SLSO${availableWorkers.length > 1 ? "s" : ""} available`
                : "No SLSOs available"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center bg-muted rounded-md p-0.5 mr-1">
              <button
                onClick={() => setViewMode("cards")}
                className={cn("p-1 rounded transition-colors", viewMode === "cards" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
                title="Card view"
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={cn("p-1 rounded transition-colors", viewMode === "table" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
                title="Table view"
              >
                <Table2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5" onClick={handlePrint} disabled={printing} title="Save as image">
              <Printer className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Periods */}
         <div ref={printRef} className="overflow-hidden divide-y divide-border bg-white" style={{ fontSize: '11px', height: '100%', display: 'flex', flexDirection: 'column' }}>
           <style>{`
             @media print {
               @page { size: A4; margin: 8mm; }
               body { margin: 0; padding: 0; }
             }
             #print-container { page-break-after: avoid; height: 100%; display: flex; flex-direction: column; }
             #print-container > div { page-break-inside: avoid; flex: 1; }
           `}</style>

           {/* Table View */}
           {viewMode === "table" && (
             <div className="p-2 overflow-auto flex-1">
               <p className="text-[9px] font-bold text-foreground mb-1">{displayDate}</p>
               <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                 <thead>
                   <tr style={{ backgroundColor: '#f1f5f9' }}>
                     <th style={{ border: '1px solid #e2e8f0', padding: '3px 6px', textAlign: 'left', fontWeight: 700 }}>Period</th>
                     <th style={{ border: '1px solid #e2e8f0', padding: '3px 6px', textAlign: 'left', fontWeight: 700 }}>Student</th>
                     <th style={{ border: '1px solid #e2e8f0', padding: '3px 6px', textAlign: 'left', fontWeight: 700 }}>SLSO</th>
                     <th style={{ border: '1px solid #e2e8f0', padding: '3px 6px', textAlign: 'left', fontWeight: 700 }}>Subject</th>
                     <th style={{ border: '1px solid #e2e8f0', padding: '3px 6px', textAlign: 'left', fontWeight: 700 }}>Room</th>
                     <th style={{ border: '1px solid #e2e8f0', padding: '3px 6px', textAlign: 'left', fontWeight: 700 }}>Notes</th>
                   </tr>
                 </thead>
                 <tbody>
                   {PERIODS.flatMap((period) => {
                     const templateSlots = getTemplateAssignments(dayName, period);
                     const bookings = getBookingsForCell(dateStr, period);
                     const rows = [];

                     // Group template slots by class (same slso + subject + room)
                     const classGroups = {};
                     templateSlots.forEach((s) => {
                       const key = `${s.slso_id || ""}__${s.subject || ""}__${s.room_number || ""}`;
                       if (!classGroups[key]) {
                         const absence = s.slso_id ? absences.find((a) => a.worker_id === s.slso_id) : null;
                         const cover = absence?.cover_worker_id && absence.cover_worker_id !== "none"
                           ? allWorkers.find((w) => w.id === absence.cover_worker_id) : null;
                         classGroups[key] = {
                           period,
                           students: [],
                           slso: absence ? `${s.slso_name} → ${cover ? cover.name : "TBD"}` : (s.slso_name || ""),
                           subject: s.subject || "",
                           room: s.room_number || "",
                           notes: "",
                           cancelled: false,
                           isAbsent: !!absence,
                         };
                       }
                       classGroups[key].students.push(s.notes ? `${s.student_name} (${s.notes})` : s.student_name);
                     });
                     Object.values(classGroups).forEach((g) => rows.push({ ...g, student: g.students.join(", ") }));

                     bookings.forEach((b) => {
                       rows.push({ period, student: b.student_name, slso: b.slso_name || "", subject: "", room: "", notes: b.notes || "", cancelled: b.is_cancelled, isAbsent: false });
                     });

                     return rows;
                   }).map((row, i) => {
                     const periodColor = [1, 3].includes(row.period) ? '#fff' : '#f0f4f8';
                     return (
                     <tr key={i} style={{ backgroundColor: periodColor, opacity: row.cancelled ? 0.5 : 1 }}>
                       <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px', fontWeight: 700, color: '#334155' }}>P{row.period}</td>
                       <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px', textDecoration: row.cancelled ? 'line-through' : 'none' }}>{row.student}</td>
                       <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px', color: row.isAbsent ? '#92400e' : '#475569' }}>{row.slso}</td>
                       <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px', color: '#64748b' }}>{row.subject}</td>
                       <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px', color: '#64748b' }}>{row.room}</td>
                       <td style={{ border: '1px solid #e2e8f0', padding: '3px 6px', color: '#64748b' }}>{row.notes}{row.cancelled ? " [Cancelled]" : ""}</td>
                       </tr>
                       );
                       })}
                 </tbody>
               </table>
             </div>
           )}

           <div id="print-container" style={{ display: viewMode === "cards" ? "flex" : "none", flexDirection: "column", height: "100%" }}>
           {PERIODS.map((period) => {
             const templateSlots = getTemplateAssignments(dayName, period);
             const bookings = getBookingsForCell(dateStr, period);
             const classes = groupByClass(templateSlots);

             return (
               <div key={period} className="px-2 py-0.5 flex flex-col">
                 <div className="flex items-center justify-between mb-1">
                   <div className="flex items-center gap-1">
                     <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold text-foreground">
                       {period}
                     </span>
                     <span className="text-[10px] font-semibold text-foreground">P{period}</span>
                   </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-5 text-[8px] gap-0.5 px-1.5 print:hidden"
                    onClick={() => setBookingDialog({ period })}
                  >
                    <Plus className="w-2 h-2" />
                    Add
                  </Button>
                  </div>

                  {/* Template schedule */}
                  {classes.length > 0 && (
                  <div className="space-y-0.5 mb-0.5 flex-1">
                    {classes.map((cls, i) => {
                       const slsoColor = cls.slso_id
                         ? availableWorkers.find((w) => w.id === cls.slso_id)?.color
                         : null;
                       const absence = cls.slso_id ? absences.find((a) => a.worker_id === cls.slso_id) : null;
                       const cover = absence?.cover_worker_id && absence.cover_worker_id !== "none"
                         ? allWorkers.find((w) => w.id === absence.cover_worker_id)
                         : null;
                       return (
                         <div key={i} className={cn("rounded border px-1.5 py-0.5", absence ? "border-amber-300 bg-amber-50/60" : "border-border/60 bg-muted/40")}>
                           <div className="flex items-center gap-0.5 mb-0.5 text-[9px]">
                             {slsoColor && (
                               <span className="w-1 h-1 rounded-full flex-shrink-0 opacity-40" style={{ backgroundColor: slsoColor }} />
                             )}
                             {cls.slso_name && (
                               <span className={cn("font-medium truncate", absence ? "line-through text-muted-foreground/50" : "text-muted-foreground")}>{cls.slso_name}</span>
                             )}
                             {absence && (
                               <span className="flex items-center gap-0.5 ml-1 flex-shrink-0">
                                 <span className="text-amber-700 font-semibold text-[8px]">→</span>
                                 {cover ? (
                                   <>
                                     <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: cover.color || "#4F46E5" }} />
                                     <span className="text-amber-800 font-medium text-[8px]">{cover.name}</span>
                                   </>
                                 ) : (
                                   <span className="text-amber-600 italic text-[8px]">TBD</span>
                                 )}
                               </span>
                             )}
                             {(cls.subject || cls.room_number) && (
                               <span className="text-muted-foreground/60 ml-auto text-[8px] truncate">
                                 {cls.subject}{cls.subject && cls.room_number ? " · " : ""}{cls.room_number ? `Rm ${cls.room_number}` : ""}
                               </span>
                             )}
                           </div>
                           <div className="space-y-0 pl-2">
                             {cls.members.map((s) => (
                               <div key={s.id}>
                                 <div className="text-[8px] font-semibold text-foreground leading-tight truncate">{s.student_name}</div>
                                 {s.notes && (
                                   <div className="text-[7px] text-muted-foreground/70 leading-tight">{s.notes}</div>
                                 )}
                               </div>
                             ))}
                           </div>
                         </div>
                       );
                     })}
                  </div>
                )}

                {/* One-off bookings */}
                {bookings.length > 0 && (
                  <div className="space-y-0.5 mb-0.5">
                    {bookings.map((booking) => {
                      const slsoColor = booking.slso_id
                        ? availableWorkers.find((w) => w.id === booking.slso_id)?.color
                        : null;
                      return (
                        <div
                          key={booking.id}
                          className={cn(
                            "rounded border px-1.5 py-0.5",
                            booking.is_cancelled
                              ? "border-destructive/30 bg-destructive/5 opacity-60"
                              : "border-accent/40 bg-accent/8"
                          )}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-0.5 mb-0.5 text-[8px]">
                                <Bookmark className="w-1.5 h-1.5 text-accent flex-shrink-0" />
                                {slsoColor && (
                                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: slsoColor }} />
                                )}
                                {booking.slso_name && (
                                  <span className="text-muted-foreground truncate">{booking.slso_name}</span>
                                )}
                                {booking.is_cancelled && (
                                  <span className="text-[7px] text-destructive font-medium ml-auto flex-shrink-0">Cancelled</span>
                                )}
                              </div>
                              <div className={cn("text-[8px] font-semibold text-foreground pl-2.5 leading-tight truncate", booking.is_cancelled && "line-through")}>
                                {booking.student_name}
                              </div>
                              {booking.notes && (
                                <div className="text-[7px] text-muted-foreground/70 pl-2.5 mt-0">{booking.notes}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0 print:hidden">
                              <button
                                onClick={() => setBookingDialog({ period, existing: booking })}
                                className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() => onDeleteBooking(booking.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {classes.length === 0 && bookings.length === 0 && (
                  <p className="text-[8px] text-muted-foreground/50 italic">No sessions</p>
                )}
              </div>
            );
            })}
            </div>
            </div>
            </div>

            {/* Booking Dialog */}
      {bookingDialog && (
        <BookingDialog
          open={!!bookingDialog}
          onOpenChange={(v) => !v && setBookingDialog(null)}
          date={dateStr}
          period={bookingDialog.period}
          students={allStudents}
          workers={availableWorkers}
          existing={bookingDialog.existing || null}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}