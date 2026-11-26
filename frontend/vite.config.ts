import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon-192.png", "icon-512.png", "maskable-192.png", "maskable-512.png"],
      manifest: {
        name: "Pollería El Wero",
        short_name: "El Wero",
        description: "Punto de venta de Pollería El Wero",
        lang: "es",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#FFFBF5",
        theme_color: "#D32F2F",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,webp,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/catalog/],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    // Las librerías de impresora publican solo la condición "browser".
    conditions: ["browser", "import", "module", "default"],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    css: false,
  },
});
