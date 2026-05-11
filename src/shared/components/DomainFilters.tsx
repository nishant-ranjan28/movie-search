import { useState } from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useGenres } from "@/shared/api/tmdb/hooks";
import type { DiscoverFilters } from "@/shared/api/tmdb/client";
import { cn } from "@/lib/cn";

export interface DomainFiltersProps {
  domain: "movie" | "tv";
  value: DiscoverFilters;
  onChange: (next: DiscoverFilters) => void;
}

const SORT_LABELS: Record<NonNullable<DiscoverFilters["sort"]>, string> = {
  "popularity.desc": "Popular",
  "vote_average.desc": "Highest rated",
  "date.desc": "Newest",
};

const CURRENT_YEAR = new Date().getFullYear();

const hasAnyFilter = (f: DiscoverFilters): boolean =>
  (f.genres !== undefined && f.genres.length > 0) ||
  f.yearGte !== undefined ||
  f.yearLte !== undefined ||
  f.ratingGte !== undefined ||
  (f.sort !== undefined && f.sort !== "popularity.desc");

export function DomainFilters({
  domain,
  value,
  onChange,
}: Readonly<DomainFiltersProps>) {
  const genres = useGenres(domain);
  const selectedGenres = value.genres ?? [];
  const sort = value.sort ?? "popularity.desc";
  const active = hasAnyFilter(value);

  const update = (patch: Partial<DiscoverFilters>) => {
    onChange({ ...value, ...patch });
  };

  const toggleGenre = (id: number) => {
    const next = selectedGenres.includes(id)
      ? selectedGenres.filter((g) => g !== id)
      : [...selectedGenres, id];
    update({ genres: next });
  };

  const clear = () => {
    onChange({});
  };

  const genreLabel =
    selectedGenres.length === 0
      ? "Genre"
      : selectedGenres.length === 1
        ? (genres.data?.find((g) => g.id === selectedGenres[0])?.name ??
          "1 genre")
        : `${selectedGenres.length} genres`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Genre multi-select */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            {genreLabel}
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1">
          <ul className="max-h-72 overflow-y-auto">
            {(genres.data ?? []).map((g) => {
              const checked = selectedGenres.includes(g.id);
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => toggleGenre(g.id)}
                    aria-pressed={checked}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm",
                      checked ? "bg-card text-fg" : "hover:bg-card/60",
                    )}
                  >
                    <span>{g.name}</span>
                    {checked ? (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>

      {/* Year range */}
      <YearRangeControl value={value} onChange={onChange} />

      {/* Min rating */}
      <RatingControl value={value} onChange={onChange} />

      {/* Sort */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            Sort: {SORT_LABELS[sort]}
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(Object.keys(SORT_LABELS) as (keyof typeof SORT_LABELS)[]).map(
            (k) => (
              <DropdownMenuItem key={k} onSelect={() => update({ sort: k })}>
                {sort === k ? (
                  <Check className="mr-2 h-3.5 w-3.5" aria-hidden />
                ) : (
                  <span className="mr-2 inline-block h-3.5 w-3.5" />
                )}
                {SORT_LABELS[k]}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {active ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={clear}
          aria-label="Clear filters"
          className="text-muted"
        >
          <X className="mr-1 h-3.5 w-3.5" aria-hidden />
          Clear
        </Button>
      ) : null}
    </div>
  );
}

function YearRangeControl({
  value,
  onChange,
}: Readonly<{
  value: DiscoverFilters;
  onChange: (next: DiscoverFilters) => void;
}>) {
  const [gte, setGte] = useState<string>(
    value.yearGte === undefined ? "" : String(value.yearGte),
  );
  const [lte, setLte] = useState<string>(
    value.yearLte === undefined ? "" : String(value.yearLte),
  );

  // Sync local input strings if parent resets the filters externally.
  const [lastGte, setLastGte] = useState<number | undefined>(value.yearGte);
  const [lastLte, setLastLte] = useState<number | undefined>(value.yearLte);
  if (value.yearGte !== lastGte) {
    setLastGte(value.yearGte);
    setGte(value.yearGte === undefined ? "" : String(value.yearGte));
  }
  if (value.yearLte !== lastLte) {
    setLastLte(value.yearLte);
    setLte(value.yearLte === undefined ? "" : String(value.yearLte));
  }

  const parseYear = (s: string): number | undefined => {
    if (s.trim() === "") return undefined;
    const n = Number.parseInt(s, 10);
    if (!Number.isFinite(n)) return undefined;
    if (n < 1900 || n > CURRENT_YEAR + 5) return undefined;
    return n;
  };

  const commit = () => {
    const yearGte = parseYear(gte);
    const yearLte = parseYear(lte);
    const next: DiscoverFilters = { ...value };
    if (yearGte === undefined) delete next.yearGte;
    else next.yearGte = yearGte;
    if (yearLte === undefined) delete next.yearLte;
    else next.yearLte = yearLte;
    onChange(next);
  };

  const label =
    value.yearGte === undefined && value.yearLte === undefined
      ? "Year"
      : `${value.yearGte ?? "…"}–${value.yearLte ?? "…"}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          {label}
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 space-y-2 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Year range
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="From"
            value={gte}
            onChange={(e) => setGte(e.target.value)}
            onBlur={commit}
            min={1900}
            max={CURRENT_YEAR + 5}
            aria-label="From year"
            className="h-8"
          />
          <span className="text-muted">–</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="To"
            value={lte}
            onChange={(e) => setLte(e.target.value)}
            onBlur={commit}
            min={1900}
            max={CURRENT_YEAR + 5}
            aria-label="To year"
            className="h-8"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RatingControl({
  value,
  onChange,
}: Readonly<{
  value: DiscoverFilters;
  onChange: (next: DiscoverFilters) => void;
}>) {
  const current = value.ratingGte ?? 0;
  const options = [0, 5, 6, 7, 7.5, 8];
  const pick = (v: number) => {
    const next: DiscoverFilters = { ...value };
    if (v === 0) delete next.ratingGte;
    else next.ratingGte = v;
    onChange(next);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          {current > 0 ? `★ ${current.toFixed(1)}+` : "Rating"}
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((v) => (
          <DropdownMenuItem key={v} onSelect={() => pick(v)}>
            {current === v || (current === 0 && v === 0) ? (
              <Check className="mr-2 h-3.5 w-3.5" aria-hidden />
            ) : (
              <span className="mr-2 inline-block h-3.5 w-3.5" />
            )}
            {v === 0 ? "Any rating" : `★ ${v.toFixed(1)} or higher`}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
