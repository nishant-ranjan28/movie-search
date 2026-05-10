# Lighthouse Baseline — 2026-05-08

End-of-Phase-1 baseline for `revamp/super-app`. Run against the production build served via Vite preview at `http://localhost:4173/` (the Today route, with mocked TMDB data and assets cached only by the precaching service worker on first paint).

Tooling: `lighthouse` 12.x (devDep), Chromium for Testing 1217 (Playwright-managed) in `--headless=new` mode.

## Scores

| Category | Score | Target | Status |
|---|---:|---:|---|
| Performance | 86 | 90 | Miss (deferred — see below) |
| Accessibility | 100 | 90 | Pass |
| Best Practices | 100 | 90 | Pass |
| SEO | 100 | 90 | Pass |
| PWA | n/a | n/a | Removed as a category in Lighthouse 12; tracked via individual audits below |

### Headline performance metrics

| Metric | Value | Audit score |
|---|---:|---:|
| First Contentful Paint | 2.1 s | 0.82 |
| Largest Contentful Paint | 3.9 s | 0.53 |
| Total Blocking Time | 10 ms | 1.00 |
| Cumulative Layout Shift | 0.031 | 1.00 |
| Speed Index | 2.1 s | 0.99 |
| Time to Interactive | 3.9 s | 0.89 |

LCP and FCP are the only weak metrics; main-thread blocking, layout stability, and Speed Index are all green.

### PWA-relevant audits (manual checks)

- `installable-manifest` — passes; the manifest is served and the SW registers.
- `service-worker` — passes; `vite-plugin-pwa` registers the precache SW.
- `maskable-icon` — passes the manifest check, but the icons are 1×1 placeholder PNGs (see deferred fixes).
- `themed-omnibox` / `viewport` / `apple-touch-icon` — all pass.

## Accessibility fixes applied this run

Lighthouse flagged `label-content-name-mismatch` (visible text not contained in the accessible name) on two button-role elements. WCAG SC 2.5.3 ("Label in Name") requires the accessible name to include the visible text. Both used `aria-label` strings that omitted the rating chip and other visible content:

- `src/features/today/TodayPage.tsx` HeroBlock — removed `aria-label={\`Open ${hero.title}\`}` so the visible "Today's pick / Title / Year" text becomes the button's accessible name.
- `src/shared/components/MediaCard.tsx` — removed `aria-label={\`${item.title}${item.year ...}\`}` for the same reason; visible text content (★ rating, title, year) now provides the accessible name.

Test fallout:

- `src/shared/components/DomainHub.test.tsx` — two assertions matched buttons by `name: /\(/`, which depended on the parenthesised year inside the old aria-label. Updated to `name: /\d{4}/` which still matches the now-text-only accessible name.

## Other fixes

- `public/robots.txt` — added a permissive `User-agent: *` / `Allow: /` file. Without it the SPA fallback returned `index.html` for `/robots.txt`, causing the SEO audit's robots syntax check to fail (this brought SEO from 92 to 100).

## Top performance opportunities (LCP path)

LCP is currently 3.9 s on the Today route. The main contributors per Lighthouse insights are:

- **`render-blocking-resources` / `render-blocking-insight`** — the single CSS file (~37 KB) is render-blocking. Acceptable for now; consider critical CSS inlining if we keep missing the target.
- **`unused-javascript`** — the production bundle is one chunk of ~690 KB (gzip 213 KB). Lighthouse reports a large fraction as unused on first paint.
- **`uses-responsive-images`** — the hero serves the `w780` poster regardless of viewport.
- **`prioritize-lcp-image` / `lcp-discovery-insight`** — the LCP element (hero `<img>`) is not preloaded; the browser discovers it only after JS hydrates.
- **`uses-rel-preconnect`** — no `preconnect` to `image.tmdb.org`.

## Deferred fixes (Phase 2 candidates)

- **Code-split the bundle**. The Vite build emits a single 690 KB JS chunk. Routes (Movies/TV/Releases/Watchlist/Search) should lazy-load via `React.lazy` + `Suspense`. Largest single win for LCP/FCP.
- **Preload + preconnect for the hero image**. Inject `<link rel="preconnect" href="https://image.tmdb.org">` in `index.html`, and emit a `<link rel="preload" as="image">` for the hero poster once known.
- **Responsive `srcSet` on poster images**. Use `w185`/`w342`/`w500`/`w780` based on the rendered slot.
- **Real PWA icons**. `public/icons/{192,512,maskable}.png` are 1×1 placeholders; replace with real artwork before public install promotion.
- **Source maps for large first-party JS** (`valid-source-maps` audit). Currently disabled; enable for production debugging tools without affecting category score.

These are not Phase-1 blockers — Accessibility, Best Practices, and SEO all hit the target, and the perf gap is structural (single-bundle SPA without route splitting).

## How to re-run

```bash
npm run build
npm run preview -- --port 4173 &
PREVIEW_PID=$!
# Wait for server
until curl -sf http://localhost:4173/ >/dev/null 2>&1; do sleep 0.5; done

# Use the Chromium that Playwright already installed
export CHROME_PATH="$HOME/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"

mkdir -p .lighthouse
npx lighthouse http://localhost:4173/ \
  --output=html --output=json \
  --output-path=.lighthouse/report \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
  --only-categories=performance,accessibility,best-practices,seo \
  --quiet

kill $PREVIEW_PID
```

Open `.lighthouse/report.report.html` for the interactive report. The `.lighthouse/` directory is gitignored.
