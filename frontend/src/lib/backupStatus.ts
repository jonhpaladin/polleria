const LAST_BACKUP_KEY = "polleria.lastBackupAt";
export const BACKUP_DONE_EVENT = "polleria:backup-done";

/** Fecha del último respaldo; `null` si nunca se descargó uno en este dispositivo. */
export function getLastBackupAt(): string | null {
  try {
    const value = localStorage.getItem(LAST_BACKUP_KEY);
    if (!value || Number.isNaN(Date.parse(value))) return null;
    return value;
  } catch {
    return null;
  }
}

export function markBackupDone(now = new Date()): string {
  const iso = now.toISOString();
  try {
    localStorage.setItem(LAST_BACKUP_KEY, iso);
  } catch {
    // En modo privado el aviso no persiste; el archivo ya se descargó.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BACKUP_DONE_EVENT));
  }
  return iso;
}

export const BACKUP_REMINDER_DAYS = 7;

export function isBackupOverdue(
  lastBackupAt: string | null,
  now = new Date(),
  days = BACKUP_REMINDER_DAYS,
): boolean {
  if (!lastBackupAt) return true;
  const last = Date.parse(lastBackupAt);
  if (Number.isNaN(last)) return true;
  return now.getTime() - last > days * 24 * 60 * 60 * 1000;
}
