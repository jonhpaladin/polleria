const DEVICE_KEY_STORAGE = "polleria.deviceKey";

/** Clave del local guardada en este dispositivo; `null` si aún no se configura. */
export function getDeviceKey(): string | null {
  try {
    const value = localStorage.getItem(DEVICE_KEY_STORAGE);
    return value && value.trim() !== "" ? value : null;
  } catch {
    return null;
  }
}

/** Guarda la clave solo en este dispositivo; el bundle nunca la incluye. */
export function setDeviceKey(value: string): void {
  try {
    localStorage.setItem(DEVICE_KEY_STORAGE, value.trim());
  } catch {
    // Sin almacenamiento la clave vive solo en memoria durante la sesión.
  }
}

export function clearDeviceKey(): void {
  try {
    localStorage.removeItem(DEVICE_KEY_STORAGE);
  } catch {
    // Nada que limpiar.
  }
}
