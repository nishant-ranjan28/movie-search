import { format, startOfWeek } from "date-fns";
import type { ReleaseEvent } from "@/shared/api/tmdb/client";
import { EmptyState } from "@/shared/components/EmptyState";
import { CalendarDays } from "lucide-react";

export interface ListViewProps {
  events: ReleaseEvent[];
}

export function ListView({ events }: ListViewProps) {
  if (events.length === 0) {
    return <EmptyState icon={CalendarDays} title="No upcoming releases" description="Check back later." />;
  }

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const groups = new Map<string, ReleaseEvent[]>();
  for (const e of sorted) {
    const week = format(startOfWeek(new Date(e.date), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const list = groups.get(week) ?? [];
    list.push(e);
    groups.set(week, list);
  }

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([weekStart, list]) => (
        <section key={weekStart} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">
            Week of {format(new Date(weekStart), "MMM d, yyyy")}
          </h2>
          <ul className="space-y-1">
            {list.map((e) => (
              <li key={e.itemId} className="flex items-center gap-2 text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-accent-movie" aria-hidden />
                <span className="text-muted">{format(new Date(e.date), "MMM d")}</span>
                <span className="font-medium">{e.title}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
