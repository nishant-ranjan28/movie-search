import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

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
  plugins: [animate],
};
export default config;
