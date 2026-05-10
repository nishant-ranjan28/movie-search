import { useState } from "react";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay,
  startOfWeek, endOfWeek, addMonths, subMonths,
} from "date-fns";
import { Link } from "react-router-dom";
import type { ReleaseEvent } from "@/shared/api/tmdb/client";
import { useReleaseProviders } from "@/shared/api/tmdb/hooks";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { labelForRelease } from "./labelForRelease";
import { releaseRoute } from "./releaseRoute";

export interface CalendarProps {
  events: ReleaseEvent[];
}

export function Calendar({ events }: CalendarProps) {
  const providers = useReleaseProviders(events);
  const [cursor, setCursor] = useState(() => new Date());
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsByDay = new Map<string, ReleaseEvent[]>();
  for (const e of events) {
    const d = new Date(e.date);
    const key = format(d, "yyyy-MM-dd");
    const list = eventsByDay.get(key) ?? [];
    list.push(e);
    eventsByDay.set(key, list);
  }

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const selectedKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedEvents = selectedKey ? eventsByDay.get(selectedKey) ?? [] : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{format(cursor, "MMMM yyyy")}</h2>
        <div className="flex gap-1">
          <Button size="icon" variant="outline" aria-label="Previous month" onClick={() => setCursor(subMonths(cursor, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" aria-label="Next month" onClick={() => setCursor(addMonths(cursor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Release calendar">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="px-1 text-center text-xs font-medium text-muted">{d}</div>
        ))}
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = d.getMonth() === cursor.getMonth();
          const selected = selectedDay && isSameDay(d, selectedDay);
          return (
            <button
              key={key}
              role="gridcell"
              aria-label={`${format(d, "MMMM d")}, ${dayEvents.length} releases`}
              onClick={() => setSelectedDay(d)}
              className={cn(
                "relative aspect-square rounded p-1 text-left text-xs",
                inMonth ? "text-fg" : "text-muted/50",
                selected ? "ring-2 ring-fg" : "hover:bg-card",
              )}
            >
              <span>{format(d, "d")}</span>
              {dayEvents.length > 0 ? (
                <span aria-hidden className="absolute bottom-1 left-1 inline-block h-1.5 w-1.5 rounded-full bg-accent-movie" />
              ) : null}
            </button>
          );
        })}
      </div>
      {selectedDay && selectedEvents.length > 0 ? (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{format(selectedDay, "MMMM d, yyyy")}</h3>
          <ul className="space-y-1 text-sm">
            {selectedEvents.map((e) => {
              const where = providers[e.itemId]?.slice(0, 2).join(", ");
              const label = labelForRelease(e.releaseType, where);
              const route = releaseRoute(e);
              return (
                <li key={`${e.itemId}@${e.date}`}>
                  {route ? (
                    <Link
                      to={route}
                      className="rounded hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                    >
                      {e.title}
                    </Link>
                  ) : (
                    <span>{e.title}</span>
                  )}
                  {label ? <span className="text-muted"> · {label}</span> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
