import { useCallback, useEffect, useState } from "react";

import {
  buildBackup,
  downloadBackupFile,
  restoreBackup,
} from "@/lib/backup";
import { BACKUP_DONE_EVENT, getLastBackupAt, markBackupDone } from "@/lib/backupStatus";
import { getDb, type PolleriaDb } from "@/lib/db";
import type { BackupCounts, BackupPayload, RestoreResult } from "@/types/backup";

const EMPTY_COUNTS: BackupCounts = {
  tickets: 0,
  outbox: 0,
  cashCuts: 0,
  dailyPrices: 0,
};

export interface UseBackupResult {
  counts: BackupCounts;
  lastBackupAt: string | null;
  loading: boolean;
  download: () => Promise<void>;
  restore: (backup: BackupPayload) => Promise<RestoreResult>;
  refresh: () => Promise<void>;
}

export function useBackup(db: PolleriaDb = getDb()): UseBackupResult {
  const [counts, setCounts] = useState<BackupCounts>(EMPTY_COUNTS);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(() => getLastBackupAt());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [tickets, outbox, cashCuts, dailyPrices] = await Promise.all([
        db.tickets.count(),
        db.outbox.count(),
        db.cashCuts.count(),
        db.dailyPrices.count(),
      ]);
      setCounts({ tickets, outbox, cashCuts, dailyPrices });
      setLastBackupAt(getLastBackupAt());
    } catch (error: unknown) {
      console.warn("BACKUP_COUNTS_FAILED", error);
      setCounts(EMPTY_COUNTS);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    // Se difiere un tick para no encadenar renders dentro del efecto de montaje.
    const start = window.setTimeout(() => {
      void refresh();
    }, 0);
    const onBackupDone = () => setLastBackupAt(getLastBackupAt());
    window.addEventListener(BACKUP_DONE_EVENT, onBackupDone);
    return () => {
      window.clearTimeout(start);
      window.removeEventListener(BACKUP_DONE_EVENT, onBackupDone);
    };
  }, [refresh]);

  const download = useCallback(async () => {
    const payload = await buildBackup(db);
    downloadBackupFile(payload);
    setLastBackupAt(markBackupDone());
    await refresh();
  }, [db, refresh]);

  const restore = useCallback(
    async (backup: BackupPayload) => {
      const result = await restoreBackup(db, backup);
      await refresh();
      return result;
    },
    [db, refresh],
  );

  return { counts, lastBackupAt, loading, download, restore, refresh };
}
