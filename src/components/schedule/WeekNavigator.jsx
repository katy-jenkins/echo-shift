import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek } from "date-fns";

export default function WeekNavigator({ currentWeekStart, onWeekChange }) {
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const isCurrentWeek = isSameWeek(currentWeekStart, new Date(), { weekStartsOn: 1 });

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-lg"
        onClick={() => onWeekChange(subWeeks(currentWeekStart, 1))}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="text-center min-w-[200px]">
        <p className="text-sm font-semibold text-foreground">
          {format(currentWeekStart, "d MMM")} — {format(weekEnd, "d MMM yyyy")}
        </p>
        {isCurrentWeek && (
          <p className="text-xs text-primary font-medium">This Week</p>
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-lg"
        onClick={() => onWeekChange(addWeeks(currentWeekStart, 1))}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      {!isCurrentWeek && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs ml-1"
          onClick={() => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))}
        >
          Today
        </Button>
      )}
    </div>
  );
}