import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUpcomingReleases } from "@/shared/api/tmdb/hooks";
import { Calendar } from "./Calendar";
import { ListView } from "./ListView";
import { Skeleton } from "@/components/ui/skeleton";

export function ReleasesPage() {
  const { from, to } = useMemo(() => {
    const f = new Date();
    const t = new Date(f.getTime() + 30 * 24 * 60 * 60 * 1000);
    return { from: f, to: t };
  }, []);
  const { data, isLoading } = useUpcomingReleases(from, to);
  const events = data;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Releases</h1>
      <p className="text-sm text-muted">Movies releasing in the next 30 days.</p>
      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar">
          {isLoading ? <Skeleton className="h-80 w-full" /> : <Calendar events={events} />}
        </TabsContent>
        <TabsContent value="list">
          {isLoading ? <Skeleton className="h-80 w-full" /> : <ListView events={events} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
