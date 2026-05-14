import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import fs from "node:fs";

/**
 * Dev-only middleware: serves `api/**\/*.ts` files as Vercel Edge-style
 * handlers under `/api/**`. In production, Vercel hosts these natively;
 * in `npm run dev` (Vite), this plugin imports the handler module and
 * invokes it with a Web `Request`, then writes the resulting `Response`
 * back to Node's `res`.
 */
const apiHandlers = (): Plugin => ({
  name: "vercel-api-dev",
  apply: "serve",
  configureServer(server) {
    // Vite only exposes VITE_-prefixed vars to client `import.meta.env`.
    // For server-side handlers (the Edge functions in api/**), we load the
    // .env files explicitly here and inject any non-VITE vars (e.g.
    // GROQ_API_KEY) into process.env so handlers can read them the same
    // way they will on Vercel.
    const envDir = __dirname;
    const env = loadEnv("development", envDir, "");
    for (const [key, value] of Object.entries(env)) {
      if (key.startsWith("VITE_")) continue;
      if (process.env[key] === undefined) process.env[key] = value;
    }

    server.middlewares.use(async (req, res, next) => {
      const url = req.url ?? "";
      if (!url.startsWith("/api/")) return next();
      const [pathOnly, queryString] = url.split("?");
      // First try exact match: /api/foo/bar → api/foo/bar.ts
      let filePath = path.join(__dirname, `${pathOnly}.ts`);
      if (!fs.existsSync(filePath)) {
        // Fall back to Vercel-style catch-all routing: walk up the path
        // looking for a `[...name].ts` file (matches the rest of the path).
        // Example: /api/tmdb/trending/movie/day → api/tmdb/[...path].ts
        filePath = "";
        const segments = (pathOnly ?? "").split("/").filter(Boolean);
        for (let i = segments.length; i > 0; i--) {
          const dir = path.join(__dirname, ...segments.slice(0, i - 1));
          if (!fs.existsSync(dir)) continue;
          const match = fs
            .readdirSync(dir)
            .find((f) => /^\[\.\.\..+\]\.ts$/.test(f));
          if (match) {
            filePath = path.join(dir, match);
            break;
          }
        }
        if (!filePath) return next();
      }

      try {
        const mod = await server.ssrLoadModule(filePath);
        const handler = mod.default as (req: Request) => Promise<Response>;
        if (typeof handler !== "function") return next();

        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const bodyBuf = Buffer.concat(chunks);

        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (typeof v === "string") headers.set(k, v);
          else if (Array.isArray(v)) headers.set(k, v.join(","));
        }
        const webReq = new Request(
          `http://localhost${pathOnly}${queryString ? `?${queryString}` : ""}`,
          {
            method: req.method,
            headers,
            ...(bodyBuf.length > 0 ? { body: new Uint8Array(bodyBuf) } : {}),
          },
        );

        const webRes = await handler(webReq);
        res.statusCode = webRes.status;
        webRes.headers.forEach((v, k) => {
          res.setHeader(k, v);
        });
        const text = await webRes.text();
        res.end(text);
      } catch (err) {
        console.error("[vercel-api-dev]", err);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "handler crashed", detail: String(err) }));
      }
    });
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    apiHandlers(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/maskable-512.png",
      ],
      manifest: {
        name: "Marquee",
        short_name: "Marquee",
        description:
          "Search movies, TV, anime, games, and books in one place.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#09090b",
        theme_color: "#09090b",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/image\.tmdb\.org\//,
            handler: "CacheFirst",
            options: {
              cacheName: "tmdb-images",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Trending + discover via our /api/tmdb proxy. Pattern matches
            // same-origin absolute URLs (the SW sees the full URL).
            urlPattern: /\/api\/tmdb\/(trending|discover)/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "tmdb-trending",
              expiration: { maxAgeSeconds: 60 * 60 },
              // Without this, a cache-miss + network failure leaves the
              // background revalidate as an unhandled rejection and the
              // FetchEvent as a "network error response". Returning a
              // synthetic 503 lets the app's error UI take over cleanly.
              plugins: [
                {
                  handlerDidError: async () =>
                    new Response(
                      JSON.stringify({ error: "offline", results: [] }),
                      {
                        status: 503,
                        statusText: "Offline",
                        headers: { "Content-Type": "application/json" },
                      },
                    ),
                },
              ],
            },
          },
          {
            urlPattern: /\/api\/tmdb\/(movie|tv)\/\d+/,
            handler: "NetworkFirst",
            options: {
              cacheName: "tmdb-details",
              expiration: { maxAgeSeconds: 24 * 60 * 60 },
              networkTimeoutSeconds: 5,
              plugins: [
                {
                  handlerDidError: async () =>
                    new Response(
                      JSON.stringify({ error: "offline", results: [] }),
                      {
                        status: 503,
                        statusText: "Offline",
                        headers: { "Content-Type": "application/json" },
                      },
                    ),
                },
              ],
            },
          },
        ],
      },
    }),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
