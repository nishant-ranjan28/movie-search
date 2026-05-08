# Phase 0 + 1 Implementation Plan — Foundation & Movies/TV Parity

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current CRA app with a fresh Vite + TS + Tailwind + shadcn foundation, and ship a Movies-and-TV-only app that is a strict UX upgrade over the current site (Today, hubs, details, watchlist, releases calendar, global search, PWA + offline shell).

**Architecture:** New Vite app in repo root. All providers wired (TanStack Query, Zustand, Theme, Router). Per-feature folders under `src/features/`. Shared `MediaItem` schema, TMDB client returns normalized items, components are domain-agnostic from day one so Phases 2–4 (Anime/Games/Books) plug in cleanly.

**Tech Stack:** Vite 5 · React 19 · TypeScript (strict) · Tailwind 3 · shadcn/ui · react-router 7 · TanStack Query v5 · Zustand (persist) · zod · framer-motion · lucide-react · vite-plugin-pwa · Vitest · React Testing Library · MSW · Playwright.

**Source design:** `docs/plans/2026-05-08-entertainment-super-app-design.md`.

**Current state:** branch `revamp/super-app`, working tree clean, design committed at `94651fd`.

---

## Conventions used in this plan

- **TDD where applicable.** Setup/scaffolding tasks (installs, configs) cannot be TDD'd; they have explicit verification commands instead.
- **Commit after each task** unless a step explicitly says otherwise.
- **Commit messages** follow Conventional Commits and end with the `Author: Nishant Ranjan` line per repo convention.
- **`pnpm` is not assumed** — the plan uses `npm` to match the current repo's `package-lock.json`.
- **Exact file paths** are given for every Create / Modify / Delete.
- **All TypeScript code is `strict: true`-clean.**

---

## Phase 0 — Foundation

### T0.1 Snapshot the legacy app for reference

**Why:** The current `src/` has working TMDB fetch patterns. We will rewrite, not port, but want them as a read-only reference.

**Files**
- Create directory: `legacy/`
- Move: `src/`, `public/`, `package.json`, `package-lock.json`, `firebase.json`, `.firebaserc`, `vercel.json`, `.firebase/`, `.eslintcache`, `README.md` → into `legacy/`

**Steps**

1. Create the snapshot:
   ```bash
   mkdir legacy
   git mv src public package.json package-lock.json firebase.json .firebaserc vercel.json README.md legacy/
   rm -rf .firebase .eslintcache
   ```
2. Verify nothing is left at root that the new app will conflict with:
   ```bash
   ls
   ```
   Expected: `LICENSE  SECURITY.md  legacy/  docs/  .git/  .github/  .gitignore  .npmrc`
3. Commit:
   ```bash
   git add -A
   git commit -m "$(cat <<'EOF'
   chore: move CRA app to legacy/ before revamp

   Author: Nishant Ranjan
   EOF
   )"
   ```

---

### T0.2 Initialize the Vite + React + TS project at the repo root

**Files**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `public/` (new, empty for now)

**Steps**

1. Initialize via `create-vite` non-interactively, into a temp dir, then move files in (avoids prompting issues at the project root):
   ```bash
   npm create vite@latest .vite-tmp -- --template react-ts
   cp -R .vite-tmp/. ./
   rm -rf .vite-tmp
   ```
2. Replace the generated `package.json` `name` field:
   ```bash
   node -e "const p=require('./package.json');p.name='movie-search';p.private=true;require('fs').writeFileSync('./package.json',JSON.stringify(p,null,2)+'\n')"
   ```
3. Install:
   ```bash
   npm install
   ```
4. Verify dev server boots:
   ```bash
   npm run dev -- --port 5173 &
   sleep 3
   curl -sf http://localhost:5173 | head -20
   kill %1 2>/dev/null || true
   ```
   Expected: HTML containing `<div id="root">`.
5. Verify build:
   ```bash
   npm run build
   ```
   Expected: `dist/` produced, no errors.
6. Commit:
   ```bash
   git add -A
   git commit -m "$(cat <<'EOF'
   feat: initialize Vite + React + TS project

   Author: Nishant Ranjan
   EOF
   )"
   ```

---

### T0.3 Lock TypeScript to strict, configure path alias `@/*` → `src/*`

**Files**
- Modify: `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`

**`tsconfig.json` final contents**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "tests"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**`vite.config.ts` updates** — add `resolve.alias`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

**Verify**
```bash
npx tsc --noEmit
npm run build
```
Both must exit 0.

**Commit**
```bash
git add -A && git commit -m "$(cat <<'EOF'
chore: enable TS strict, add @/* path alias

Author: Nishant Ranjan
EOF
)"
```

---

### T0.4 Install Tailwind 3 with theme tokens & dark/light themes via `data-theme`

**Files**
- Create: `tailwind.config.ts`, `postcss.config.js`, `src/styles/globals.css`
- Modify: `src/main.tsx` (import globals.css, drop default `index.css`)
- Delete: `src/App.css`, `src/index.css`

**Install**
```bash
npm install -D tailwindcss@^3 postcss autoprefixer @types/node
npx tailwindcss init -p
```

**`tailwind.config.ts`** (replaces auto-generated `.js`):
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["selector", "[data-theme='dark']"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        accent: {
          movie: "rgb(var(--accent-movie) / <alpha-value>)",
          tv: "rgb(var(--accent-tv) / <alpha-value>)",
          anime: "rgb(var(--accent-anime) / <alpha-value>)",
          game: "rgb(var(--accent-game) / <alpha-value>)",
          book: "rgb(var(--accent-book) / <alpha-value>)",
        },
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      borderRadius: { lg: "12px", md: "8px", sm: "4px" },
    },
  },
  plugins: [],
};
export default config;
```

**`src/styles/globals.css`**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root,
  [data-theme="dark"] {
    --bg: 9 9 11;
    --fg: 244 244 245;
    --muted: 161 161 170;
    --border: 39 39 42;
    --card: 24 24 27;
    --accent-movie: 245 158 11;
    --accent-tv: 139 92 246;
    --accent-anime: 236 72 153;
    --accent-game: 16 185 129;
    --accent-book: 14 165 233;
  }
  [data-theme="light"] {
    --bg: 255 255 255;
    --fg: 24 24 27;
    --muted: 113 113 122;
    --border: 228 228 231;
    --card: 244 244 245;
    --accent-movie: 217 119 6;
    --accent-tv: 124 58 237;
    --accent-anime: 219 39 119;
    --accent-game: 5 150 105;
    --accent-book: 2 132 199;
  }
  html, body, #root { height: 100%; }
  body { @apply bg-bg text-fg font-sans antialiased; }
}
```

**Update `src/main.tsx`** — remove `import './index.css'`, add `import "./styles/globals.css"`. Set initial theme attr before render:
```ts
document.documentElement.dataset["theme"] = "dark";
```

**Delete CRA artifacts**
```bash
rm -f src/App.css src/index.css src/assets/react.svg src/assets/* 2>/dev/null
rmdir src/assets 2>/dev/null || true
```

**Sanity check**: replace `src/App.tsx` body with a minimal Tailwind smoke:
```tsx
export default function App() {
  return <div className="p-8 text-2xl">Hello Tailwind</div>;
}
```

**Verify**
```bash
npm run build
```
Expected: build succeeds; CSS output contains the `:root` block.

**Commit**
```bash
git add -A && git commit -m "$(cat <<'EOF'
feat: add Tailwind with theme tokens (dark/light via data-theme)

Author: Nishant Ranjan
EOF
)"
```

---

### T0.5 Install core runtime dependencies

```bash
npm install \
  react-router-dom@^7 \
  @tanstack/react-query@^5 @tanstack/react-query-devtools@^5 \
  zustand@^5 \
  zod@^3 \
  framer-motion@^11 \
  lucide-react@latest \
  clsx tailwind-merge \
  class-variance-authority \
  p-throttle@^6 \
  date-fns@^3
```

**Create `src/lib/cn.ts`** (used by every component):
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...i: ClassValue[]) => twMerge(clsx(i));
```

**Verify**
```bash
npx tsc --noEmit && npm run build
```

**Commit**
```bash
git add -A && git commit -m "$(cat <<'EOF'
chore: add core runtime deps (router, query, zustand, zod, framer-motion, lucide)

Author: Nishant Ranjan
EOF
)"
```

---

### T0.6 Initialize shadcn/ui

**Files**
- Create: `components.json`, `src/components/ui/` (populated by CLI)

**Steps**
1. Run the init non-interactively:
   ```bash
   npx shadcn@latest init -d --base-color slate --css src/styles/globals.css
   ```
   This writes `components.json` with `tailwind.cssVariables: false`. **Override** `components.json` so it points at our alias and uses `tsx`:
   ```json
   {
     "$schema": "https://ui.shadcn.com/schema.json",
     "style": "default",
     "rsc": false,
     "tsx": true,
     "tailwind": {
       "config": "tailwind.config.ts",
       "css": "src/styles/globals.css",
       "baseColor": "slate",
       "cssVariables": false,
       "prefix": ""
     },
     "aliases": {
       "components": "@/components",
       "utils": "@/lib/cn",
       "ui": "@/components/ui",
       "hooks": "@/hooks"
     }
   }
   ```
2. Add the components we'll need across Phase 1:
   ```bash
   npx shadcn@latest add button card dialog sheet tabs tooltip toast input badge skeleton scroll-area dropdown-menu popover separator switch
   ```
3. Verify `npm run build` succeeds.
4. Commit:
   ```bash
   git add -A && git commit -m "$(cat <<'EOF'
   chore: initialize shadcn/ui and add v1 component set

   Author: Nishant Ranjan
   EOF
   )"
   ```

---

### T0.7 Vitest + RTL + MSW + jsdom setup

> **Adapted from original plan:** the Vite template installed Vite 8, which Vitest 2 does not peer-support. Bumped Vitest to `latest` (3.x); same for `@vitest/ui`.

**Install**
```bash
npm install -D \
  vitest@latest @vitest/ui@latest \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  jsdom \
  msw@^2
```

If `npm install` reports a peer-dep conflict between `vitest` and the installed `vite@8`, retry with `--legacy-peer-deps` and report the resolved versions in your commit message.

**Files**
- Create: `vitest.config.ts`, `src/test/setup.ts`, `src/test/server.ts`, `src/test/handlers.ts`
- Modify: `tsconfig.json` to add `"types": ["vitest/globals", "@testing-library/jest-dom"]` under compilerOptions
- Modify: `package.json` scripts

**`vitest.config.ts`**
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    css: true,
    coverage: { provider: "v8", reporter: ["text", "lcov"] },
  },
});
```

**`src/test/setup.ts`**
```ts
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**`src/test/server.ts`**
```ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";
export const server = setupServer(...handlers);
```

**`src/test/handlers.ts`** (empty for now; populated in T1.6):
```ts
import type { HttpHandler } from "msw";
export const handlers: HttpHandler[] = [];
```

**`package.json` scripts** — add:
```json
"test": "vitest",
"test:run": "vitest run",
"typecheck": "tsc --noEmit"
```

**First sanity test** — `src/App.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import App from "./App";

test("smoke: app renders", () => {
  render(<App />);
  expect(screen.getByText(/hello tailwind/i)).toBeInTheDocument();
});
```

**Verify**
```bash
npm run test:run
```
Expected: 1 passed.

**Commit**
```bash
git add -A && git commit -m "$(cat <<'EOF'
test: configure Vitest + RTL + MSW + jsdom

Author: Nishant Ranjan
EOF
)"
```

---

### T0.8 Extend ESLint flat config + add Prettier

> **Adapted from original plan:** Vite shipped ESLint 10 (flat-config only) plus the unified `typescript-eslint` package and an `eslint.config.js` already at the repo root. Do **not** create `.eslintrc.cjs` (legacy config — removed in ESLint 9). Do **not** install `@typescript-eslint/parser` or `@typescript-eslint/eslint-plugin` (replaced by `typescript-eslint`, already present).

**Install (only what's missing)**
```bash
npm install -D eslint-plugin-jsx-a11y prettier eslint-config-prettier
```

**Modify the existing `eslint.config.js`** to:
1. `import jsxA11y from "eslint-plugin-jsx-a11y"`
2. `import eslintConfigPrettier from "eslint-config-prettier"`
3. Add `jsxA11y.flatConfigs.recommended` to the config array.
4. Add `eslintConfigPrettier` **last** in the config array (turns off rules that Prettier handles).
5. Set `languageOptions.parserOptions.project` to `["./tsconfig.json", "./tsconfig.app.json", "./tsconfig.node.json"]` so type-aware rules work.

**Create `.prettierrc.json`**:
```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "arrowParens": "always"
}
```

**Add `package.json` scripts**:
```json
"lint": "eslint .",
"lint:fix": "eslint . --fix",
"format": "prettier --write ."
```

(`lint` already exists from the Vite scaffold; replace it if needed.)

**Verify**
```bash
npm run lint && npm run typecheck
```
Both must exit 0 (running `npm run lint:fix` first is fine).

**Commit**: `chore: extend ESLint flat config with jsx-a11y + Prettier`.

---

### T0.9 GitHub Actions CI

**Create `.github/workflows/ci.yml`**:
```yaml
name: CI
on:
  push: { branches: [master, "revamp/**"] }
  pull_request: { branches: [master] }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test:run
      - run: npm run build
```

**Verify**
```bash
git add .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
ci: add typecheck/lint/test/build workflow

Author: Nishant Ranjan
EOF
)"
```

(Run is verified once branch is pushed; do not push until end of Phase 0.)

---

### T0.10 Vercel config

**Create `vercel.json`** at repo root:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Verify** with `vercel build` if Vercel CLI is installed; otherwise rely on `npm run build` succeeding.

**Commit**: `chore: configure Vercel for Vite SPA with SPA fallback`.

---

### T0.11 Theme system: hook + toggle

**Files**
- Create: `src/hooks/useTheme.ts`, `src/components/ThemeToggle.tsx`, `src/hooks/useTheme.test.ts`, `src/components/ThemeToggle.test.tsx`

**TDD — Step 1: failing test for `useTheme`**
```ts
// src/hooks/useTheme.test.ts
import { act, renderHook } from "@testing-library/react";
import { useTheme } from "./useTheme";

test("defaults to dark and writes data-theme", () => {
  document.documentElement.removeAttribute("data-theme");
  localStorage.clear();
  const { result } = renderHook(() => useTheme());
  expect(result.current.theme).toBe("dark");
  expect(document.documentElement.dataset["theme"]).toBe("dark");
});

test("toggles and persists", () => {
  localStorage.clear();
  const { result } = renderHook(() => useTheme());
  act(() => result.current.toggle());
  expect(result.current.theme).toBe("light");
  expect(localStorage.getItem("theme")).toBe("light");
});
```

Run: `npm run test:run -- useTheme` → expect FAIL (file not found).

**Step 2: implement** — `src/hooks/useTheme.ts`
```ts
import { useCallback, useEffect, useState } from "react";

type Theme = "dark" | "light";
const KEY = "theme";

const apply = (t: Theme) => { document.documentElement.dataset["theme"] = t; };

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(KEY);
    return stored === "light" || stored === "dark" ? stored : "dark";
  });
  useEffect(() => { apply(theme); localStorage.setItem(KEY, theme); }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return { theme, toggle };
};
```

Run tests → expect PASS.

**Step 3: implement `ThemeToggle.tsx`** using lucide `Sun` / `Moon` and shadcn `Button`. Add a test verifying the button renders the right icon based on theme.

**Commit**: `feat: theme system (dark/light) with persistence`.

---

### T0.12 Provider stack & root layout

**Files**
- Create: `src/app/Providers.tsx`, `src/app/RootLayout.tsx`, `src/app/router.tsx`
- Modify: `src/main.tsx`, `src/App.tsx` (delete; router replaces it)

**`Providers.tsx`** wraps children with `QueryClientProvider`, `<TooltipProvider>` from shadcn, and a `<Toaster />`:
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={qc}>
    <TooltipProvider delayDuration={150}>{children}<Toaster /></TooltipProvider>
    {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
  </QueryClientProvider>
);
```

**`RootLayout.tsx`** — top bar (logo + global search button + ThemeToggle + Install button placeholder), `<Outlet />`, bottom tab bar (mobile) / left rail (desktop).

**`router.tsx`** uses `createBrowserRouter` with placeholder pages:
```tsx
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./RootLayout";
import { TodayPage } from "@/features/today/TodayPage";
// ...
export const router = createBrowserRouter([{
  path: "/",
  element: <RootLayout />,
  children: [
    { index: true, element: <TodayPage /> },
    { path: "movies", element: <MoviesHub /> },
    { path: "movies/:id", element: <MovieDetail /> },
    { path: "tv", element: <TvHub /> },
    { path: "tv/:id", element: <TvDetail /> },
    { path: "anime", element: <ComingSoon domain="anime" /> },
    { path: "games", element: <ComingSoon domain="game" /> },
    { path: "books", element: <ComingSoon domain="book" /> },
    { path: "watchlist", element: <WatchlistPage /> },
    { path: "releases", element: <ReleasesPage /> },
    { path: "search", element: <SearchPage /> },
    { path: "settings", element: <SettingsPage /> },
    { path: "*", element: <NotFound /> },
  ],
}]);
```

Each page is a stub that renders its name; real impls land in subsequent tasks.

**Test**: `src/app/router.test.tsx` — `MemoryRouter`-based test verifying each route resolves to its named stub.

**Commit**: `feat: providers, root layout, router with placeholder routes`.

---

### T0.13 Drop the `legacy/` directory

**Why now:** It has served its purpose — we have referenced TMDB patterns once and have nothing left to port. Keeping it complicates `tsc`, lint, and CI.

**Steps**
1. `git rm -r legacy/`
2. Verify `npm run lint && npm run typecheck && npm run test:run && npm run build` all pass.
3. Commit: `chore: remove legacy CRA app`.

---

### T0.14 Update `.gitignore`, rewrite README, set app title

**`.gitignore` add** (only entries not already present from the Vite-template merge):
```
/dist
/.vercel
/.idea
/coverage
/playwright-report
/test-results
.env*.local
.env
```
(Many of these are already present after T0.2 merged the Vite-template `.gitignore`. Just diff and add what's missing.)

**Set `index.html` `<title>` to `Movie Search`** (Vite scaffold leaked `vite-tmp` from the temp-dir name).

**Rewrite `README.md`** to describe: what the app is, env vars (`VITE_TMDB_KEY`), `npm run dev/build/test/lint/typecheck`, deploy target (Vercel), link to design doc.

**Commit**: `docs: rewrite README, finalize .gitignore, set app title`.

---

### Phase 0 exit criteria

- `npm run dev` boots; `/` shows the layout with a placeholder Today page.
- `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build` all pass.
- All 11 routes render their stub.
- Theme toggle persists and switches `data-theme`.
- CI workflow file present (will fire on next push).

---

## Phase 1 — Movies + TV parity

### T1.1 Define the unified `MediaItem` zod schema

**Files**
- Create: `src/shared/schemas/media.ts`, `src/shared/schemas/media.test.ts`

**TDD — failing test**
```ts
import { MediaItemSchema } from "./media";

test("parses a minimal valid item", () => {
  const item = MediaItemSchema.parse({
    id: "tmdb:movie:603",
    domain: "movie",
    title: "The Matrix",
    genres: ["sci-fi"],
    external: [],
  });
  expect(item.id).toBe("tmdb:movie:603");
});

test("rejects unknown domain", () => {
  expect(() => MediaItemSchema.parse({
    id: "x", domain: "podcast", title: "x", genres: [], external: [],
  })).toThrow();
});
```

**Implement**
```ts
// src/shared/schemas/media.ts
import { z } from "zod";

export const MediaDomainSchema = z.enum(["movie","tv","anime","game","book"]);
export type MediaDomain = z.infer<typeof MediaDomainSchema>;

export const MediaItemSchema = z.object({
  id: z.string().regex(/^[a-z]+:[a-z]+:.+$/, "namespaced id required"),
  domain: MediaDomainSchema,
  title: z.string(),
  altTitle: z.string().optional(),
  year: z.number().int().optional(),
  poster: z.object({ src: z.string().url(), blurhash: z.string().optional() }).optional(),
  synopsis: z.string().optional(),
  rating: z.object({
    score: z.number(), outOf: z.literal(10), votes: z.number().int().optional(),
  }).optional(),
  genres: z.array(z.string()),
  releaseDate: z.string().optional(),
  status: z.enum(["released","upcoming","ongoing","ended"]).optional(),
  external: z.array(z.object({ provider: z.string(), url: z.string().url().optional() })),
});
export type MediaItem = z.infer<typeof MediaItemSchema>;
```

**Run tests**, **commit** `feat: MediaItem zod schema`.

---

### T1.2 TMDB raw response zod schemas + fixtures

**Files**
- Create: `src/shared/api/tmdb/schemas.ts`, `src/shared/api/tmdb/fixtures/movie-603.json`, `src/shared/api/tmdb/fixtures/tv-1399.json`, `src/shared/api/tmdb/fixtures/trending-movie.json`, `src/shared/api/tmdb/fixtures/search-matrix.json`
- Test: `src/shared/api/tmdb/schemas.test.ts`

**Action:** copy real (sanitized) TMDB response shapes into `fixtures/*.json` (paste from TMDB docs or live `curl`). Define zod schemas matching them. Tests parse each fixture.

**Commit**: `feat: TMDB raw response schemas with fixtures`.

---

### T1.3 TMDB normalizers — `toMediaItem(movie)` and `toMediaItem(tv)`

**Files**
- Create: `src/shared/api/tmdb/normalize.ts`, `src/shared/api/tmdb/normalize.test.ts`

**Tests** (one per shape) feed the fixture JSON in, assert the resulting `MediaItem` matches `MediaItemSchema` and contains the expected `id`, `domain`, `title`, etc.

**Implement** keeping the original payload in `raw`. Use `image.tmdb.org/t/p/w500${poster_path}` for poster; namespace ids `tmdb:movie:${id}` / `tmdb:tv:${id}`.

**Commit**: `feat: TMDB → MediaItem normalizers`.

---

### T1.4 TMDB client (fetch wrapper, env, endpoints)

**Files**
- Create: `src/shared/api/tmdb/client.ts`, `src/shared/api/tmdb/client.test.ts`, `.env.example`
- Modify: `src/vite-env.d.ts` (declare `VITE_TMDB_KEY`)

**`client.ts`** exports:
```ts
export const tmdb = {
  searchMovies(q: string, signal?: AbortSignal): Promise<MediaItem[]>,
  searchTv(q: string, signal?: AbortSignal): Promise<MediaItem[]>,
  trending(domain: "movie" | "tv", window: "day" | "week"): Promise<MediaItem[]>,
  movieDetails(id: number): Promise<MediaItemDetails>,
  tvDetails(id: number): Promise<MediaItemDetails>,
  upcoming(domain: "movie" | "tv", from: Date, to: Date): Promise<ReleaseEvent[]>,
  watchProviders(domain: "movie" | "tv", id: number, region: string): Promise<string[]>,
};
```

Internally: a single `request()` helper that injects `api_key`, parses JSON, runs the appropriate zod schema, throws a typed `ApiError` on non-2xx or schema failure.

**Tests** use MSW handlers (registered in T1.6) — for now, just unit-test `request()` URL composition.

**Commit**: `feat: TMDB API client with zod-parsed responses`.

---

### T1.5 MSW handlers for TMDB (test infrastructure)

**Files**
- Modify: `src/test/handlers.ts` to export TMDB handlers serving the fixtures from T1.2.

**Verify**: re-run `npm run test:run` — all existing tests still pass; `client.test.ts` can now exercise the real fetch path against MSW.

**Commit**: `test: MSW handlers for TMDB endpoints`.

---

### T1.6 React Query hooks per endpoint

**Files**
- Create: `src/shared/api/tmdb/hooks.ts`

**Hooks (one per endpoint)** with stale times from the design (trending 1h, details 24h, search 5m). Search hook accepts a debounced query.

```ts
export const useMovieTrending = (window: "day"|"week" = "day") =>
  useQuery({
    queryKey: ["tmdb","trending","movie",window],
    queryFn: ({ signal }) => tmdb.trending("movie", window, signal),
    staleTime: 60 * 60 * 1000,
  });
// ... similarly for searchMovies, movieDetails, etc.
```

**Tests**: render a hook with `QueryClientProvider`, assert it returns data from the MSW fixture.

**Commit**: `feat: TanStack Query hooks for TMDB`.

---

### T1.7 Watchlist Zustand slice (persist)

**Files**
- Create: `src/shared/store/watchlist.ts`, `src/shared/store/watchlist.test.ts`

**Test**
```ts
test("add then read; persisted to localStorage", () => {
  localStorage.clear();
  useWatchlistStore.getState().add({ itemId: "tmdb:movie:603", domain: "movie", snapshot: {...} });
  expect(useWatchlistStore.getState().has("tmdb:movie:603")).toBe(true);
  expect(localStorage.getItem("watchlist")).toContain("603");
});
test("status update + remove", () => { /* ... */ });
```

**Implement** with `zustand` + `persist({ name: "watchlist" })`. Public API:
```ts
type Store = {
  entries: Record<string, WatchlistEntry>;
  add(input: Omit<WatchlistEntry, "addedAt"|"status"> & Partial<Pick<WatchlistEntry,"status">>): void;
  remove(itemId: string): void;
  setStatus(itemId: string, status: WatchlistEntry["status"]): void;
  setRating(itemId: string, rating: 1|2|3|4|5): void;
  has(itemId: string): boolean;
  list(): WatchlistEntry[];
};
```

**Commit**: `feat: watchlist store with localStorage persistence`.

---

### T1.8 Minimal taste profile slice (recents + dismissed only — full algo lands in Phase 5)

**Files**
- Create: `src/shared/store/taste.ts`, `src/shared/store/taste.test.ts`

Tracks `recentItems` (MRU, capped at 50) and `dismissedItems` (Set). Public API: `markOpened(id)`, `dismiss(id)`, `isDismissed(id)`, `recent()`. Persist key `taste`.

**Commit**: `feat: minimal taste profile (recents + dismissed)`.

---

### T1.9 Shared `MediaCard` component

**Files**
- Create: `src/shared/components/MediaCard.tsx`, `src/shared/components/MediaCard.test.tsx`

**Test** asserts:
- Renders title and year.
- Domain accent bar uses the right CSS variable for each of movie / tv / anime / game / book.
- Clicking card calls `onOpen(item)` prop.
- WatchlistButton in card toggles store membership.

**Impl** uses shadcn `Card`, lucide `Bookmark` icon, hover state with framer-motion `whileHover={{ scale: 1.02 }}`. Domain-colored 2 px top border via `border-t-2 border-accent-${item.domain}`.

**Commit**: `feat: MediaCard with per-domain accent`.

---

### T1.10 `MediaCardSkeleton`, `RailCarousel`, `EmptyState`

**Files**: `src/shared/components/{MediaCardSkeleton,RailCarousel,EmptyState}.tsx` + tests.

`RailCarousel` — horizontal `ScrollArea` with snap, prev/next buttons (desktop), responsive item width.

**Commit**: `feat: shared rail/skeleton/empty-state components`.

---

### T1.11 Today page — hero + 2 trending rails

**Files**
- Create: `src/features/today/TodayPage.tsx`, `src/features/today/TodayPage.test.tsx`, `src/features/today/heroPick.ts`, `src/features/today/heroPick.test.ts`

**`heroPick.ts`** — pure function picking 1 of N candidates deterministically per local YYYY-MM-DD seed (Phase-5 scoring later replaces this; for v1 it's seeded random over trending).
```ts
export const heroPickIndex = (seed: string, n: number) =>
  Number(BigInt("0x" + sha1(seed).slice(0, 12)) % BigInt(n));
```
Test asserts stability across calls with same seed.

**`TodayPage.tsx`** renders:
- Hero (one TMDB trending movie)
- Rail "Trending Movies"
- Rail "Trending TV"
- "Coming this week" rail (uses `tmdb.upcoming` for movies + an early stub for TV)

Loading states use `MediaCardSkeleton`. Each rail wrapped in `<ErrorBoundary fallback={…}>` (use a small inline error boundary for now; full one in T1.18).

**Commit**: `feat: Today page with hero and trending rails`.

---

### T1.12 `/movies` and `/tv` hubs

**Files**
- Create: `src/features/movies/MoviesHub.tsx`, `src/features/tv/TvHub.tsx`, plus minimal hub-level tests.

Each renders: search input (debounced 300 ms), trending grid, optional genre filter chips (sourced from TMDB `/genre/{movie,tv}/list`).

Reuse a shared `<DomainHub domain="movie" client={tmdb.searchMovies} trending={tmdb.trending("movie")} />` to keep the two hubs DRY.

**Commit**: `feat: Movies and TV hubs`.

---

### T1.13 Detail page `/movies/:id` and `/tv/:id`

**Files**
- Create: `src/shared/components/MediaDetailLayout.tsx`, `src/features/movies/MovieDetail.tsx`, `src/features/tv/TvDetail.tsx`, plus tests.

`MediaDetailLayout` props: `item: MediaItemDetails`. Renders backdrop + poster + facts strip + synopsis + cast top 5 + watch-providers + trailer iframe (YouTube embed) + related row + WatchlistButton.

Detail pages call `useMovieDetails(id)` / `useTvDetails(id)`, show `MediaCardSkeleton` shape during load.

**Commit**: `feat: detail pages for movies and TV`.

---

### T1.14 `WatchlistButton` with optimistic update

**Files**
- Create: `src/shared/components/WatchlistButton.tsx`, `src/shared/components/WatchlistButton.test.tsx`

Three states (not added / added / in progress). On click, optimistically toggles store; if a downstream sync fails (none for v1, but the structure is there), rollback. Test asserts the optimistic toggle shows immediately.

**Commit**: `feat: watchlist button with optimistic updates`.

---

### T1.15 `/watchlist` page

**Files**
- Create: `src/features/watchlist/WatchlistPage.tsx`, plus tests.

Filter chips (domain × status), sort dropdown, list rendering `MediaCard` per entry, drag-to-reorder via the HTML5 drag API (desktop), bulk actions (mark watched, remove). Empty state when no entries.

Background refresh: on mount, `useEffect` triggers a throttled batch (`p-throttle`, concurrency 5) of `tmdb.movieDetails` / `tvDetails` for stale entries (>24 h); store updates `snapshot`.

**Commit**: `feat: watchlist page with filters, sort, and background refresh`.

---

### T1.16 `/releases` calendar + list

**Files**
- Create: `src/features/releases/ReleasesPage.tsx`, `src/features/releases/Calendar.tsx`, `src/features/releases/ListView.tsx`, plus tests.

Pull movie/TV releases for a 30-day window from TMDB `/discover` and per-show `next_episode_to_air`. Calendar = month grid, dots colored by domain. List = grouped-by-week chronological. Toggle between views via shadcn `Tabs`. Filters: domain, "watchlist only".

**Commit**: `feat: releases calendar and list views`.

---

### T1.17 `/search` global search

**Files**
- Create: `src/features/search/SearchPage.tsx`, plus tests.

Single input → fires `tmdb.searchMovies` and `tmdb.searchTv` in parallel via TanStack Query. Results grouped by domain with section headings and counts. Empty / loading / error states.

**Commit**: `feat: global search across movies and TV`.

---

### T1.18 Error boundaries (per-route + global)

**Files**
- Create: `src/shared/components/ErrorBoundary.tsx`, `src/shared/components/ErrorBoundary.test.tsx`

Wrap each route element via the router's `errorElement` plus an inner per-rail variant for partial degradation on Today.

**Commit**: `feat: route- and rail-level error boundaries`.

---

### T1.19 PWA manifest, icons, vite-plugin-pwa

**Install**
```bash
npm install -D vite-plugin-pwa workbox-window
```

**Files**
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-512.png` (placeholders OK for v1; final art later).
- Modify: `vite.config.ts` to register `VitePWA` with manifest + workbox config below.

**Workbox runtime caching** (in `vite.config.ts`):
```ts
VitePWA({
  registerType: "prompt",
  includeAssets: ["icons/*.png"],
  manifest: {
    name: "Entertainment Hub",
    short_name: "Hub",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/image\.tmdb\.org\//,
        handler: "CacheFirst",
        options: {
          cacheName: "tmdb-images",
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /^https:\/\/api\.themoviedb\.org\/3\/(trending|discover)/,
        handler: "StaleWhileRevalidate",
        options: { cacheName: "tmdb-trending", expiration: { maxAgeSeconds: 60 * 60 } },
      },
      {
        urlPattern: /^https:\/\/api\.themoviedb\.org\/3\/(movie|tv)\/\d+/,
        handler: "NetworkFirst",
        options: { cacheName: "tmdb-details", expiration: { maxAgeSeconds: 24 * 60 * 60 } },
      },
    ],
  },
});
```

**Commit**: `feat: PWA manifest and Workbox runtime caching`.

---

### T1.20 Install button + SW update toast

**Files**
- Create: `src/app/InstallButton.tsx`, `src/app/SwUpdateToast.tsx`

`InstallButton` listens for `beforeinstallprompt`, stores it, shows a top-bar button when present and not dismissed. Dismissal stored 30 days in localStorage.

`SwUpdateToast` uses `workbox-window`'s `Workbox` to detect waiting SW and show a toast "New version — reload" → `messageSkipWaiting()` + `window.location.reload()`.

**Commit**: `feat: install button and SW update toast`.

---

### T1.21 Playwright E2E: install → search → watchlist → today rail; theme persistence; offline reload

**Install**
```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

**Files**
- Create: `playwright.config.ts`, `e2e/today.spec.ts`, `e2e/watchlist.spec.ts`, `e2e/theme.spec.ts`, `e2e/offline.spec.ts`
- Modify: `package.json` → `"e2e": "playwright test"`

**Write 4 specs** covering the flows above. Use a deployed Vercel preview or local `npm run preview` as `webServer`.

**Commit**: `test: Playwright E2E for core flows`.

---

### T1.22 Lighthouse smoke

Manual checklist (not gated in CI for v1): run Lighthouse on `npm run preview`, record PWA / Performance / Accessibility scores in a `docs/quality/2026-05-08-lighthouse.md`. Target ≥ 90 on each. Fix obvious issues (alt text, focus, contrast) before declaring Phase 1 done.

**Commit**: `docs: lighthouse baseline for v1`.

---

### Phase 1 exit criteria

- All 11 routes render real content for movies/TV; anime/game/book are "Coming soon" placeholders.
- Watchlist persists across refresh; works offline (read of last snapshot).
- Today page, hubs, details, watchlist, releases calendar, global search all functional.
- PWA installable; offline reload of `/` shows last cached state.
- Type-check, lint, unit tests, E2E tests pass on CI.
- Lighthouse PWA + a11y ≥ 90.

---

## After Phase 1

The branch `revamp/super-app` is ready to merge to `master`. Subsequent phases (Anime, Games, Books, Recs v2, Push, RSS/iCal, Polish) each get their own implementation plan and PR per the design.

---

## Tasks summary (count: 32)

Phase 0: T0.1 – T0.14 (14 tasks)
Phase 1: T1.1 – T1.22 (22 tasks; T1.6/T1.18 are infra-style, the rest are TDD)
