# Marquee

An entertainment hub for movies, TV, anime, games, and books — all in one PWA.

## Status

This is the v2 revamp, currently being built on the `revamp/super-app` branch.

- Design doc: [`docs/plans/2026-05-08-entertainment-super-app-design.md`](docs/plans/2026-05-08-entertainment-super-app-design.md)
- Implementation plan: [`docs/plans/2026-05-08-phase-0-1-implementation.md`](docs/plans/2026-05-08-phase-0-1-implementation.md)

## Tech stack

- Vite + React 19 + TypeScript (strict)
- Tailwind CSS + shadcn/ui
- react-router 7
- TanStack Query
- Zustand
- Vitest + React Testing Library + MSW

## Quick start

```bash
npm install --legacy-peer-deps
npm run dev
```

`--legacy-peer-deps` is required temporarily because `eslint-plugin-jsx-a11y`'s
peer-range trails ESLint 10. We will drop the flag when upstream catches up.

## Environment variables

Create a `.env.local` file at the repo root.

| Variable         | Required for     | Notes                                                              |
| ---------------- | ---------------- | ------------------------------------------------------------------ |
| `VITE_TMDB_KEY`  | Phase 1: Movies/TV | TMDB API key — https://developer.themoviedb.org/                  |

Phase 2+ adds `VITE_RAWG_KEY` (games). Phase 6 adds VAPID keys for web push.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — production build
- `npm run preview` — serve the production build locally
- `npm run test` — Vitest in watch mode
- `npm run test:run` — Vitest single-pass (CI mode)
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` / `npm run lint:fix`
- `npm run format` / `npm run format:check`

## Deploy

Hosted on Vercel. After linking the project, just run:

```bash
vercel
```

Build command and output directory are configured in `vercel.json`.

## Project layout

See the design doc for the full layout. In short:

- `src/features/<domain>/` — feature code (movies, tv, anime, games, books)
- `src/shared/` — cross-domain code (UI primitives, hooks, utilities)
- `src/app/` — app shell, providers, and routing

## License

See [`LICENSE`](LICENSE).
