import { describe, expect, it } from "vitest";

import { SyncApiError } from "@/lib/syncApi";
import {
  backoffDelayMs,
  isAuthError,
  isPermanentSyncError,
  SYNC_BASE_DELAY_MS,
  SYNC_MAX_DELAY_MS,
} from "@/lib/syncPolicy";

describe("isPermanentSyncError", () => {
  it("trata un 4xx de validación como definitivo", () => {
    for (const status of [400, 404, 409, 422]) {
      expect(isPermanentSyncError(new SyncApiError("HTTP", "x", status))).toBe(true);
    }
  });

  it("reintenta 401, 403, 408, 429 y 5xx", () => {
    for (const status of [401, 403, 408, 429, 500, 503]) {
      expect(isPermanentSyncError(new SyncApiError("HTTP", "x", status))).toBe(false);
    }
  });

  it("identifica los errores de clave del local", () => {
    expect(isAuthError(new SyncApiError("HTTP", "x", 401))).toBe(true);
    expect(isAuthError(new SyncApiError("HTTP", "x", 403))).toBe(true);
    expect(isAuthError(new SyncApiError("HTTP", "x", 422))).toBe(false);
    expect(isAuthError(new SyncApiError("NETWORK", "x"))).toBe(false);
  });

  it("reintenta fallos de red, timeout y JSON inválido", () => {
    for (const code of ["NETWORK", "TIMEOUT", "INVALID_JSON"] as const) {
      expect(isPermanentSyncError(new SyncApiError(code, "x"))).toBe(false);
    }
  });

  it("no marca como definitivo un error inesperado", () => {
    expect(isPermanentSyncError(new Error("boom"))).toBe(false);
    expect(isPermanentSyncError("texto")).toBe(false);
  });
});

describe("backoffDelayMs", () => {
  it("crece exponencialmente desde la base", () => {
    expect(backoffDelayMs(1, () => 1)).toBe(SYNC_BASE_DELAY_MS);
    expect(backoffDelayMs(2, () => 1)).toBe(SYNC_BASE_DELAY_MS * 2);
    expect(backoffDelayMs(3, () => 1)).toBe(SYNC_BASE_DELAY_MS * 4);
  });

  it("aplica jitter entre 50 % y 100 % del techo", () => {
    expect(backoffDelayMs(1, () => 0)).toBe(SYNC_BASE_DELAY_MS / 2);
    expect(backoffDelayMs(1, () => 0.999)).toBeLessThanOrEqual(SYNC_BASE_DELAY_MS);
  });

  it("respeta el tope de 5 minutos", () => {
    expect(backoffDelayMs(30, () => 1)).toBe(SYNC_MAX_DELAY_MS);
  });

  it("trata un intento inválido como el primero", () => {
    expect(backoffDelayMs(0, () => 1)).toBe(SYNC_BASE_DELAY_MS);
    expect(backoffDelayMs(Number.NaN, () => 1)).toBe(SYNC_BASE_DELAY_MS);
  });
});
