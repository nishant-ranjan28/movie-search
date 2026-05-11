import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bookmark,
  Film,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { cn } from "@/lib/cn";
import { GlobalSearchInput } from "./GlobalSearchInput";
import { InstallButton } from "./InstallButton";

interface MobileNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface DesktopNavItem {
  to: string;
  label: string;
  end?: boolean;
}

// Mobile bottom tab bar — 5 tabs max for ergonomics. Search is reachable
// via the search icon in the mobile top bar; Releases is reachable from
// the "Coming this week" link on /today.
const mobileNavItems: readonly MobileNavItem[] = [
  { to: "/", label: "Today", icon: Sparkles, end: true },
  { to: "/movies", label: "Movies", icon: Film },
  { to: "/tv", label: "TV", icon: Tv },
  { to: "/watchlist", label: "Watchlist", icon: Bookmark },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

// Desktop top nav — no width constraint, all primary destinations get a
// link. Labels only (no icons) — labels read clearly horizontally and
// match common desktop web nav conventions. "Search" is omitted: the
// inline GlobalSearchInput in the top bar replaces it.
const desktopNavItems: readonly DesktopNavItem[] = [
  { to: "/", label: "Today", end: true },
  { to: "/movies", label: "Movies" },
  { to: "/tv", label: "TV" },
  { to: "/watchlist", label: "Watchlist" },
  { to: "/releases", label: "Releases" },
  { to: "/settings", label: "Settings" },
];

function HomeLink() {
  return (
    <Link
      to="/"
      aria-label="Marquee — go to home"
      className="rounded text-lg font-semibold tracking-tight hover:text-fg/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
    >
      Marquee
    </Link>
  );
}

function MobileSearchButton() {
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Search"
      onClick={() => {
        navigate("/search");
      }}
    >
      <Search className="h-5 w-5" aria-hidden />
    </Button>
  );
}

function Actions() {
  // Single mount point for ThemeToggle + InstallButton. Switched in/out of
  // the desktop top bar vs. mobile header by the viewport-conditional
  // render in RootLayout, so side-effecting components only mount once.
  return (
    <>
      <ThemeToggle />
      <InstallButton />
    </>
  );
}

export function RootLayout() {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-6 border-b border-border bg-bg/80 px-6 backdrop-blur">
          <HomeLink />
          <nav aria-label="Primary" className="flex items-center gap-1">
            {desktopNavItems.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end ?? false}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium",
                    isActive
                      ? "bg-card text-fg"
                      : "text-muted hover:bg-card/60 hover:text-fg",
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex flex-1 justify-center px-4">
            <GlobalSearchInput />
          </div>
          <div className="flex items-center gap-2">
            <Actions />
          </div>
        </header>

        <main className="flex-1 px-8 py-6">
          <Outlet />
        </main>
      </div>
    );
  }

  // Mobile + tablet (<1024 px).
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-bg/80 px-4 backdrop-blur">
        <HomeLink />
        <div className="flex items-center gap-1">
          <MobileSearchButton />
          <Actions />
        </div>
      </header>

      <main className="flex-1 px-4 pb-20 pt-4">
        <Outlet />
      </main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-bg/95 backdrop-blur"
      >
        {mobileNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end ?? false}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                isActive ? "text-fg" : "text-muted hover:text-fg",
              )
            }
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
