import { registerSW } from "virtual:pwa-register";

import { PWA_NEED_REFRESH_EVENT, PWA_UPDATE_EVENT } from "@/lib/pwaEvents";

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Registra el service worker en modo "prompt": cuando hay una versión nueva,
 * avisa a React para que el cajero decida cuándo recargar.
 */
export function registerPwa(): void {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new Event(PWA_NEED_REFRESH_EVENT));
    },
    onOfflineReady() {
      console.info("Catálogo listo para usarse sin conexión.");
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) {
        return;
      }
      window.setInterval(() => {
        void registration.update();
      }, UPDATE_CHECK_INTERVAL_MS);
    },
  });

  window.addEventListener(PWA_UPDATE_EVENT, () => {
    void updateSW(true);
  });
}
