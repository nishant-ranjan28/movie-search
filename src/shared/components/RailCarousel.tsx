import { ChevronLeft, ChevronRight } from "lucide-react";
import { Children, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface RailCarouselProps {
  title: string;
  children: ReactNode;
  className?: string;
  itemWidthClass?: string;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function RailCarousel({
  title,
  children,
  className,
  itemWidthClass = "w-36 sm:w-40 md:w-44",
}: Readonly<RailCarouselProps>) {
  const ref = useRef<HTMLDivElement>(null);
  const headingId = `rail-${slug(title)}`;

  const scrollBy = (dx: number) => {
    ref.current?.scrollBy({ left: dx, behavior: "smooth" });
  };

  return (
    <section className={cn("space-y-2", className)} aria-labelledby={headingId}>
      <div className="flex items-center justify-between">
        <h2 id={headingId} className="text-base font-semibold">
          {title}
        </h2>
        <div className="hidden gap-1 sm:flex">
          <button
            type="button"
            aria-label={`Scroll ${title} left`}
            onClick={() => scrollBy(-320)}
            className="rounded-full p-1 text-muted hover:text-fg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={`Scroll ${title} right`}
            onClick={() => scrollBy(320)}
            className="rounded-full p-1 text-muted hover:text-fg"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {Children.map(children, (child, i) => (
          <div key={`rail-item-${i}`} className={cn("shrink-0 snap-start", itemWidthClass)}>
            {child}
          </div>
        ))}
      </div>
    </section>
  );
}
