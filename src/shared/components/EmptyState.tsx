import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-12 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="h-10 w-10 text-muted" aria-hidden /> : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? <p className="text-sm text-muted">{description}</p> : null}
      {action}
    </div>
  );
}
