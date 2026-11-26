import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "@/App";
import { PrinterTestPage } from "@/pages/PrinterTestPage";
import { registerPwa } from "@/lib/pwa";
import "@/styles.css";

registerPwa();

const isPrinterTest =
  window.location.pathname === "/printer-test" ||
  new URLSearchParams(window.location.search).has("printer-test");

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Falta el nodo #root en index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    {isPrinterTest ? <PrinterTestPage /> : <App />}
  </StrictMode>,
);
