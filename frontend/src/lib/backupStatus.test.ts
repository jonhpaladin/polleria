import { describe, expect, it } from "vitest";

import {
  getLastBackupAt,
  isBackupOverdue,
  markBackupDone,
} from "@/lib/backupStatus";

describe("isBackupOverdue", () => {
  it("marca sin respaldo o con más de 7 días", () => {
    const now = new Date("2026-11-23T12:00:00Z");

    expect(isBackupOverdue(null, now)).toBe(true);
    expect(isBackupOverdue("2026-11-20T12:00:00Z", now)).toBe(false);
    expect(isBackupOverdue("2026-11-15T11:59:00Z", now)).toBe(true);
    expect(isBackupOverdue("no-es-fecha", now)).toBe(true);
  });
});

describe("last backup", () => {
  it("guarda y lee la fecha del último respaldo", () => {
    localStorage.clear();
    expect(getLastBackupAt()).toBeNull();

    const iso = markBackupDone(new Date("2026-11-23T12:00:00Z"));

    expect(iso).toBe("2026-11-23T12:00:00.000Z");
    expect(getLastBackupAt()).toBe(iso);
  });
});
