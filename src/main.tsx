import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./styles/globals.css";
import { Providers } from "./app/Providers";
import { router } from "./app/router";
import { SwUpdateToast } from "./app/SwUpdateToast";

document.documentElement.dataset["theme"] = "dark";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <SwUpdateToast />
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
