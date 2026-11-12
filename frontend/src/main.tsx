import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "@/App";
import { registerPwa } from "@/lib/pwa";
import "@/styles.css";

registerPwa();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Falta el nodo #root en index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
