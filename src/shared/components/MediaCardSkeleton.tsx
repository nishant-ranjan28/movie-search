import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function MediaCardSkeleton() {
  return (
    <Card
      className="overflow-hidden border-t-2 border-t-border"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="aspect-[2/3] w-full" />
      <div className="space-y-1 p-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </Card>
  );
}
