import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./styles/globals.css";
import { Providers } from "./app/Providers";
import { router } from "./app/router";
import { SwUpdateToast } from "./app/SwUpdateToast";

// Restore persisted theme before the first paint to avoid a dark flash
// on reload for users who selected light. Falls back to dark when missing
// or invalid (matches useTheme's default + validation).
const stored = localStorage.getItem("theme");
const initialTheme = stored === "light" || stored === "dark" ? stored : "dark";
document.documentElement.dataset["theme"] = initialTheme;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <SwUpdateToast />
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
