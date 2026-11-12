import { useCallback, useEffect, useState } from "react";

import { PWA_NEED_REFRESH_EVENT, PWA_UPDATE_EVENT } from "@/lib/pwaEvents";

/** Conecta el aviso del service worker con la UI sin acoplar React al registro. */
export function usePwaUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => {
    const onNeedRefresh = () => setNeedRefresh(true);
    window.addEventListener(PWA_NEED_REFRESH_EVENT, onNeedRefresh);
    return () => window.removeEventListener(PWA_NEED_REFRESH_EVENT, onNeedRefresh);
  }, []);

  const update = useCallback(() => {
    window.dispatchEvent(new Event(PWA_UPDATE_EVENT));
  }, []);

  const dismiss = useCallback(() => setNeedRefresh(false), []);

  return { needRefresh, update, dismiss };
}
