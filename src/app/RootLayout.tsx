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
import { cn } from "@/lib/cn";
import { InstallButton } from "./InstallButton";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const navItems: readonly NavItem[] = [
  { to: "/", label: "Today", icon: Sparkles, end: true },
  { to: "/search", label: "Search", icon: Search },
  { to: "/watchlist", label: "Watchlist", icon: Bookmark },
  { to: "/releases", label: "Releases", icon: CalendarDays },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function RootLayout() {
  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar (lg+). Hidden below lg; bottom tabs take over. */}
      <aside
        aria-label="App"
        className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-bg/80 backdrop-blur lg:flex"
      >
        <div className="flex h-14 items-center px-4">
          <Link
            to="/"
            aria-label="Marquee — go to home"
            className="rounded text-lg font-semibold tracking-tight hover:text-fg/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
          >
            Marquee
          </Link>
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-1 px-2">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end ?? false}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-card text-fg"
                    : "text-muted hover:bg-card/60 hover:text-fg",
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2 border-t border-border px-3 py-3">
          <ThemeToggle />
          <InstallButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile/tablet top bar (<lg) */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-bg/80 px-4 backdrop-blur lg:hidden">
          <Link
            to="/"
            aria-label="Marquee — go to home"
            className="rounded text-lg font-semibold tracking-tight hover:text-fg/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
          >
            Marquee
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <InstallButton />
          </div>
        </header>

        <main className="flex-1 px-4 pb-20 pt-4 lg:px-8 lg:pb-6">
          <Outlet />
        </main>

        {/* Mobile/tablet bottom tab bar (<lg) */}
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-bg/95 backdrop-blur lg:hidden"
        >
          {navItems.map(({ to, label, icon: Icon, end }) => (
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
    </div>
  );
}
