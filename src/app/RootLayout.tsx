import { Link, NavLink, Outlet } from "react-router-dom";
import {
  Bookmark,
  CalendarDays,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { cn } from "@/lib/cn";
import { GlobalSearchInput } from "./GlobalSearchInput";
import { InstallButton } from "./InstallButton";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

// All 5 nav items used by the mobile bottom tab bar.
const mobileNavItems: readonly NavItem[] = [
  { to: "/", label: "Today", icon: Sparkles, end: true },
  { to: "/search", label: "Search", icon: Search },
  { to: "/watchlist", label: "Watchlist", icon: Bookmark },
  { to: "/releases", label: "Releases", icon: CalendarDays },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

// Desktop top nav drops "Search" — the inline search box in the top bar
// replaces it.
const desktopNavItems: readonly NavItem[] = [
  { to: "/", label: "Today", icon: Sparkles, end: true },
  { to: "/watchlist", label: "Watchlist", icon: Bookmark },
  { to: "/releases", label: "Releases", icon: CalendarDays },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
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
        <div className="flex items-center gap-2">
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
