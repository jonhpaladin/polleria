import { useEffect, useState } from "react";

import { BACKUP_DONE_EVENT, getLastBackupAt, isBackupOverdue } from "@/lib/backupStatus";
import { getDb, type PolleriaDb } from "@/lib/db";

/** Marca si conviene recordar el respaldo en la pestaña. */
export function useBackupStatus(db: PolleriaDb = getDb()): boolean {
  const [overdue, setOverdue] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const [tickets, cuts] = await Promise.all([db.tickets.count(), db.cashCuts.count()]);
        if (!active) return;
        setOverdue((tickets > 0 || cuts > 0) && isBackupOverdue(getLastBackupAt()));
      } catch {
        if (active) setOverdue(false);
      }
    };
    const onBackupDone = () => {
      void check();
    };

    void check();
    const timer = window.setInterval(() => void check(), 60_000);
    window.addEventListener(BACKUP_DONE_EVENT, onBackupDone);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(BACKUP_DONE_EVENT, onBackupDone);
    };
  }, [db]);

  return overdue;
}
