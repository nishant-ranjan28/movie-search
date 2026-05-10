import { AlertCircle } from "lucide-react";
import { EmptyState } from "@/shared/components/EmptyState";
import { Button } from "@/components/ui/button";

export function RouteErrorFallback() {
  return (
    <div className="p-8">
      <EmptyState
        icon={AlertCircle}
        title="Page failed to load"
        description="Try refreshing or going home."
        action={
          <Button onClick={() => (window.location.href = "/")}>Go home</Button>
        }
      />
    </div>
  );
}
