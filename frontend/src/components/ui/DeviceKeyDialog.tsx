import { useState, type FormEvent } from "react";

import { getDeviceKey, setDeviceKey } from "@/lib/deviceKey";

interface DeviceKeyDialogProps {
  onClose: () => void;
  onSaved: () => void;
}

/** Captura una sola vez la clave del local en este dispositivo. */
export function DeviceKeyDialog({ onClose, onSaved }: DeviceKeyDialogProps) {
  const [value, setValue] = useState("");
  const [existing] = useState(() => getDeviceKey() !== null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = value.trim();
    if (!key) return;
    setDeviceKey(key);
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-key-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-3 rounded-t-2xl bg-cream-50 p-4 shadow-xl sm:rounded-2xl"
      >
        <div>
          <h2 id="device-key-title" className="text-lg font-black text-brand-700">
            Clave del local
          </h2>
          <p className="text-sm text-stone-600">
            Se guarda solo en este dispositivo y se usa para sincronizar ventas y ver el corte
            remoto. Te la da el dueño.
          </p>
        </div>
        <label className="block text-sm font-semibold text-stone-700" htmlFor="device-key">
          Clave
        </label>
        <input
          id="device-key"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base"
        />
        {existing ? (
          <p className="text-xs text-stone-500">
            Ya hay una clave guardada; si guardas otra, la reemplaza.
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            disabled={!value.trim()}
            className="min-h-12 flex-1 rounded-lg bg-brand-600 px-4 font-bold text-white disabled:opacity-60"
          >
            Guardar clave
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-700"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
