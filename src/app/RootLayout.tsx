import { NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/cn";
import { InstallButton } from "./InstallButton";

const navItems: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "Today", end: true },
  { to: "/search", label: "Search" },
  { to: "/watchlist", label: "Watchlist" },
  { to: "/releases", label: "Releases" },
  { to: "/settings", label: "Settings" },
];

export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-bg/80 px-4 backdrop-blur">
        <div className="text-lg font-semibold tracking-tight">Reel</div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <InstallButton />
        </div>
      </header>

      <main className="flex-1 px-4 pb-20 pt-4">
        <Outlet />
      </main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-bg/95 backdrop-blur"
      >
        {navItems.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end ?? false}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center text-xs font-medium",
                isActive ? "text-fg" : "text-muted hover:text-fg",
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
