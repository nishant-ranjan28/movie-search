import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, Check, GripVertical, Trash2 } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useWatchlistStore, type WatchlistEntry } from "@/shared/store/watchlist";
import type { MediaItem, MediaDomain } from "@/shared/schemas/media";
import { MediaCard } from "@/shared/components/MediaCard";
import { EmptyState } from "@/shared/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

type SortKey = "custom" | "recent" | "title" | "year" | "rating";

const DOMAIN_LABELS: Record<MediaDomain, string> = {
  movie: "Movies",
  tv: "TV",
  anime: "Anime",
  game: "Games",
  book: "Books",
};

const STATUS_LABELS: Record<WatchlistEntry["status"], string> = {
  want: "Want",
  in_progress: "In progress",
  done: "Done",
  dropped: "Dropped",
};

const SORT_LABELS: Record<SortKey, string> = {
  custom: "Custom (drag to reorder)",
  recent: "Recently added",
  title: "Title",
  year: "Year",
  rating: "Rating",
};

const itemFromEntry = (e: WatchlistEntry): MediaItem => ({
  id: e.itemId,
  domain: e.domain,
  title: e.snapshot.title,
  ...(e.snapshot.poster ? { poster: e.snapshot.poster } : {}),
  ...(e.snapshot.year === undefined ? {} : { year: e.snapshot.year }),
  genres: e.snapshot.genres,
  ...(e.snapshot.releaseDate ? { releaseDate: e.snapshot.releaseDate } : {}),
  ...(e.snapshot.status ? { status: e.snapshot.status } : {}),
  external: [],
});

export function WatchlistPage() {
  const navigate = useNavigate();
  const entriesMap = useWatchlistStore((s) => s.entries);
  const order = useWatchlistStore((s) => s.order);
  const reorder = useWatchlistStore((s) => s.reorder);
  const setStatusMany = useWatchlistStore((s) => s.setStatusMany);
  const removeMany = useWatchlistStore((s) => s.removeMany);
  const entries = useMemo(() => Object.values(entriesMap), [entriesMap]);
  const [domainFilter, setDomainFilter] = useState<MediaDomain | "all">("all");
  const [statusFilter, setStatusFilter] = useState<WatchlistEntry["status"] | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  // Exit selection mode on Escape. Also clear selection if filters change so
  // hidden cards don't stay selected invisibly.
  useEffect(() => {
    if (!selecting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelecting(false);
        setSelectedIds(new Set());
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [selecting]);

  // Clear selection when filters change (selected-but-hidden items are
  // confusing — the action toolbar count would include cards the user can't
  // see).
  const filterFingerprint = `${domainFilter}|${statusFilter}`;
  const [lastFilterFingerprint, setLastFilterFingerprint] = useState(filterFingerprint);
  if (filterFingerprint !== lastFilterFingerprint) {
    setLastFilterFingerprint(filterFingerprint);
    if (selectedIds.size > 0) setSelectedIds(new Set());
  }

  const presentDomains = useMemo(() => {
    const set = new Set<MediaDomain>();
    for (const e of entries) set.add(e.domain);
    return set;
  }, [entries]);

  const filtered = useMemo(() => {
    return entries
      .filter((e) => domainFilter === "all" || e.domain === domainFilter)
      .filter((e) => statusFilter === "all" || e.status === statusFilter);
  }, [entries, domainFilter, statusFilter]);

  const sorted = useMemo(() => {
    if (sortKey === "custom") {
      // Render in user-defined order. Entries are looked up from the order
      // array (so the sequence matches the store) and then filtered.
      const filterSet = new Set(filtered.map((e) => e.itemId));
      return order
        .map((id) => entriesMap[id])
        .filter((e): e is WatchlistEntry => e !== undefined && filterSet.has(e.itemId));
    }
    const arr = [...filtered];
    switch (sortKey) {
      case "recent":
        arr.sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));
        break;
      case "title":
        arr.sort((a, b) => a.snapshot.title.localeCompare(b.snapshot.title));
        break;
      case "year":
        arr.sort((a, b) => (b.snapshot.year ?? 0) - (a.snapshot.year ?? 0));
        break;
      case "rating":
        arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
    }
    return arr;
  }, [filtered, sortKey, order, entriesMap]);

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="Your watchlist is empty"
        description="Add movies, shows, anime, games, or books to track them here."
        action={<Button onClick={() => navigate("/")}>Discover Today</Button>}
      />
    );
  }

  const open = (item: MediaItem) => {
    const numericId = item.id.split(":").pop();
    if (item.domain === "movie") navigate(`/movies/${numericId}`);
    else if (item.domain === "tv") navigate(`/tv/${numericId}`);
  };

  // Drag reorder only makes sense in "Custom" sort, and only when filters
  // are at defaults — otherwise translating a filtered-view reorder to a
  // global-order reorder has surprising edge cases. We show a hint instead.
  const filtersAtDefaults = domainFilter === "all" && statusFilter === "all";
  const dragEnabled = sortKey === "custom" && filtersAtDefaults;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Watchlist</h1>

      <fieldset className="flex flex-wrap items-center gap-2 border-0 p-0">
        <legend className="sr-only">Domain filter</legend>
        <Chip active={domainFilter === "all"} onClick={() => setDomainFilter("all")}>
          All
        </Chip>
        {(Object.keys(DOMAIN_LABELS) as MediaDomain[])
          .filter((d) => presentDomains.has(d))
          .map((d) => (
            <Chip
              key={d}
              active={domainFilter === d}
              onClick={() => setDomainFilter(d)}
            >
              {DOMAIN_LABELS[d]}
            </Chip>
          ))}
      </fieldset>

      <fieldset className="flex flex-wrap items-center gap-2 border-0 p-0">
        <legend className="sr-only">Status filter</legend>
        <Chip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
          All
        </Chip>
        {(Object.keys(STATUS_LABELS) as WatchlistEntry["status"][]).map((s) => (
          <Chip
            key={s}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          >
            {STATUS_LABELS[s]}
          </Chip>
        ))}
      </fieldset>

      {selecting ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card/40 p-2">
          <p className="text-sm font-medium">
            {selectedIds.size} selected
          </p>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set(sorted.map((e) => e.itemId)))}
            disabled={selectedIds.size === sorted.length}
            className="text-xs text-muted hover:text-fg disabled:opacity-50"
          >
            Select all visible
          </button>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={selectedIds.size === 0}
              onClick={() => {
                setStatusMany([...selectedIds], "done");
                setSelectedIds(new Set());
                setSelecting(false);
              }}
            >
              <Check className="mr-1 h-3.5 w-3.5" aria-hidden /> Mark watched
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={selectedIds.size === 0}
              onClick={() => {
                setStatusMany([...selectedIds], "want");
                setSelectedIds(new Set());
                setSelecting(false);
              }}
            >
              <Bookmark className="mr-1 h-3.5 w-3.5" aria-hidden /> Mark want
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={selectedIds.size === 0}
              onClick={() => setConfirmRemoveOpen(true)}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden /> Remove
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelecting(false);
                setSelectedIds(new Set());
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            {sorted.length} item{sorted.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelecting(true)}
            >
              Select
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Sort: {SORT_LABELS[sortKey]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <DropdownMenuItem key={k} onSelect={() => setSortKey(k)}>
                    {SORT_LABELS[k]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {sortKey === "custom" && !filtersAtDefaults && !selecting ? (
        <p className="text-xs text-muted">
          Clear filters to drag items in Custom order.
        </p>
      ) : null}

      <Dialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Remove {selectedIds.size} item{selectedIds.size === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription>
              These entries will be deleted from your watchlist. This can't be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRemoveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                removeMany([...selectedIds]);
                setSelectedIds(new Set());
                setSelecting(false);
                setConfirmRemoveOpen(false);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {sorted.length === 0 ? (
        <EmptyState title="No matches" description="Try a different filter." />
      ) : selecting ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {sorted.map((entry) => {
            const checked = selectedIds.has(entry.itemId);
            return (
              <SelectableCard
                key={entry.itemId}
                entry={entry}
                checked={checked}
                onToggle={() => {
                  const next = new Set(selectedIds);
                  if (checked) next.delete(entry.itemId);
                  else next.add(entry.itemId);
                  setSelectedIds(next);
                }}
              />
            );
          })}
        </div>
      ) : dragEnabled ? (
        <SortableGrid
          items={sorted}
          onOpen={open}
          onReorder={(activeId, overId) => {
            // arrayMove operates on the filtered view; since filters are at
            // defaults here, the view equals the global order — so overId's
            // index in the visible list equals its global index.
            const oldIdx = sorted.findIndex((e) => e.itemId === activeId);
            const newIdx = sorted.findIndex((e) => e.itemId === overId);
            if (oldIdx === -1 || newIdx === -1) return;
            reorder(activeId, newIdx);
          }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {sorted.map((entry) => (
            <MediaCard
              key={entry.itemId}
              item={itemFromEntry(entry)}
              onOpen={open}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SelectableCard({
  entry,
  checked,
  onToggle,
}: Readonly<{
  entry: WatchlistEntry;
  checked: boolean;
  onToggle: () => void;
}>) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={`Select ${entry.snapshot.title}`}
      onClick={onToggle}
      className={cn(
        "relative rounded-md text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg",
        checked && "ring-2 ring-fg",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border border-border bg-bg/90 text-fg",
          checked && "bg-fg text-bg",
        )}
      >
        {checked ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
      </span>
      <div className="pointer-events-none">
        <MediaCard item={itemFromEntry(entry)} />
      </div>
    </button>
  );
}

function SortableGrid({
  items,
  onOpen,
  onReorder,
}: Readonly<{
  items: WatchlistEntry[];
  onOpen: (item: MediaItem) => void;
  onReorder: (activeId: string, overId: string) => void;
}>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Local optimistic order; reset whenever the prop changes.
  const [localItems, setLocalItems] = useState(items);
  // Sync if upstream changes (add/remove etc.) without dragging.
  const upstreamIds = items.map((e) => e.itemId).join("|");
  const [lastUpstream, setLastUpstream] = useState(upstreamIds);
  if (upstreamIds !== lastUpstream) {
    setLastUpstream(upstreamIds);
    setLocalItems(items);
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = localItems.findIndex((i) => i.itemId === active.id);
    const newIdx = localItems.findIndex((i) => i.itemId === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    setLocalItems(arrayMove(localItems, oldIdx, newIdx));
    onReorder(String(active.id), String(over.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={localItems.map((i) => i.itemId)}
        strategy={rectSortingStrategy}
      >
        <ul className="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {localItems.map((entry) => (
            <SortableCard
              key={entry.itemId}
              entry={entry}
              onOpen={onOpen}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableCard({
  entry,
  onOpen,
}: Readonly<{
  entry: WatchlistEntry;
  onOpen: (item: MediaItem) => void;
}>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.itemId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="relative">
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${entry.snapshot.title}`}
        className="absolute right-1 top-1 z-10 rounded bg-bg/80 p-1 text-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
      <MediaCard item={itemFromEntry(entry)} onOpen={onOpen} />
    </li>
  );
}

function Chip({
  active,
  onClick,
  children,
}: Readonly<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition",
        active ? "bg-fg text-bg" : "bg-card text-fg hover:bg-card/80",
      )}
    >
      {children}
    </button>
  );
}
