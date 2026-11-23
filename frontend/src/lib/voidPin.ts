const PIN_STORAGE_KEY = "polleria.voidPin";
const ITERATIONS = 100_000;
const PIN_PATTERN = /^\d{4,6}$/;
const MAX_FAILURES = 5;
const FAILURE_WINDOW_MS = 60_000;

interface StoredPin {
  salt: string;
  hash: string;
  iterations: number;
}

let failures: number[] = [];

export function isVoidPinFormat(value: string): boolean {
  return PIN_PATTERN.test(value);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function randomSalt(): Uint8Array {
  const salt = new Uint8Array(16);
  globalThis.crypto.getRandomValues(salt);
  return salt;
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Este dispositivo no soporta el PIN seguro. Abre la app por HTTPS.");
  }
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

function readStoredPin(): StoredPin | null {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as StoredPin).salt !== "string" ||
      typeof (parsed as StoredPin).hash !== "string" ||
      typeof (parsed as StoredPin).iterations !== "number"
    ) {
      return null;
    }
    return parsed as StoredPin;
  } catch {
    return null;
  }
}

function sameHash(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function hasVoidPin(): boolean {
  return readStoredPin() !== null;
}

/** Guarda solo el hash con sal; el PIN nunca se persiste ni se envía. */
export async function setVoidPin(pin: string): Promise<void> {
  if (!isVoidPinFormat(pin)) {
    throw new Error("El PIN debe tener entre 4 y 6 dígitos.");
  }
  const salt = randomSalt();
  const hash = await derive(pin, salt, ITERATIONS);
  const stored: StoredPin = {
    salt: bytesToBase64(salt),
    hash,
    iterations: ITERATIONS,
  };
  localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(stored));
  resetVoidPinFailures();
}

export async function verifyVoidPin(pin: string): Promise<boolean> {
  if (!isVoidPinFormat(pin)) return false;
  const stored = readStoredPin();
  if (!stored) return false;
  try {
    const hash = await derive(pin, base64ToBytes(stored.salt), stored.iterations);
    return sameHash(hash, stored.hash);
  } catch {
    return false;
  }
}

export function clearVoidPin(): void {
  localStorage.removeItem(PIN_STORAGE_KEY);
  resetVoidPinFailures();
}

export function voidPinLocked(now = Date.now()): boolean {
  failures = failures.filter((time) => now - time < FAILURE_WINDOW_MS);
  return failures.length >= MAX_FAILURES;
}

export function registerVoidPinFailure(now = Date.now()): void {
  failures = failures.filter((time) => now - time < FAILURE_WINDOW_MS);
  failures.push(now);
}

export function resetVoidPinFailures(): void {
  failures = [];
}
