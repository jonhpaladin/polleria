import { useEffect, useRef, useState } from "react";

import { usePrinter } from "@/hooks/usePrinter";
import { buildDiagnosticBytes, buildDiagnosticTicket } from "@/printer/encoder";

function stamp(): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

export function PrinterTestPage() {
  const printer = usePrinter();
  const [log, setLog] = useState<string[]>([]);
  const previousStatus = useRef(printer.state.status);

  function add(message: string) {
    setLog((current) => [`${stamp()} ${message}`, ...current].slice(0, 80));
  }

  useEffect(() => {
    if (previousStatus.current !== printer.state.status) {
      add(`Estado: ${printer.state.status}`);
      previousStatus.current = printer.state.status;
    }
  }, [printer.state.status]);

  function logBytes(): void {
    try {
      const bytes = buildDiagnosticBytes({ codepage: printer.state.codepage });
      add(`Bytes generados: ${bytes.length}`);
    } catch (cause) {
      add(`Error al codificar: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }

  return (
    <main className="min-h-dvh bg-cream-50 px-4 pb-12 pt-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <header>
          <a href="/" className="text-sm font-bold text-brand-700 underline">
            ← Volver al POS
          </a>
          <h1 className="mt-3 text-2xl font-black text-stone-900">Diagnóstico de impresora</h1>
          <p className="text-sm text-stone-600">
            Página de prueba para Android: BLE, USB, acentos, QR y código de barras.
          </p>
        </header>

        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="text-lg font-bold text-stone-900">Estado</h2>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-stone-500">Estado</dt>
            <dd className="font-semibold text-stone-900">{printer.state.status}</dd>
            <dt className="text-stone-500">Dispositivo</dt>
            <dd className="font-semibold text-stone-900">{printer.state.deviceName ?? "—"}</dd>
            <dt className="text-stone-500">Web Bluetooth</dt>
            <dd className="font-semibold text-stone-900">
              {printer.state.supportedBle ? "disponible" : "no disponible"}
            </dd>
            <dt className="text-stone-500">WebUSB</dt>
            <dd className="font-semibold text-stone-900">
              {printer.state.supportedUsb ? "disponible" : "no disponible"}
            </dd>
            <dt className="text-stone-500">Pendientes</dt>
            <dd className="font-semibold text-stone-900">
              {printer.state.pending} · error {printer.state.failed + printer.state.uncertain}
            </dd>
          </dl>
          {printer.state.message ? (
            <p role="status" className="mt-2 rounded-lg bg-stone-50 p-2 text-sm text-stone-700">
              {printer.state.message}
            </p>
          ) : null}
        </section>

        <section className="grid gap-2 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              add("Solicitando BLE…");
              void printer.connect("ble").then(() => add("Fin de conexión BLE."));
            }}
            disabled={!printer.state.supportedBle}
            className="min-h-12 rounded-xl bg-brand-600 px-4 font-bold text-white disabled:opacity-40"
          >
            Conectar BLE
          </button>
          <button
            type="button"
            onClick={() => {
              add("Solicitando USB…");
              void printer.connect("usb").then(() => add("Fin de conexión USB."));
            }}
            disabled={!printer.state.supportedUsb}
            className="min-h-12 rounded-xl bg-stone-900 px-4 font-bold text-white disabled:opacity-40"
          >
            Conectar USB
          </button>
          <button
            type="button"
            onClick={() => {
              logBytes();
              void printer.printTest().then(() => add("Prueba enviada."));
            }}
            className="min-h-12 rounded-xl border border-stone-300 px-4 font-bold text-stone-800"
          >
            Imprimir prueba
          </button>
          <button
            type="button"
            onClick={() => {
              add("Abriendo impresión del sistema…");
              void printer.printWithSystem(buildDiagnosticTicket());
            }}
            className="min-h-12 rounded-xl border border-stone-300 px-4 font-bold text-stone-800"
          >
            Imprimir con el sistema
          </button>
          <button
            type="button"
            onClick={() => void printer.disconnect().then(() => add("Desconectada."))}
            className="min-h-12 rounded-xl border border-stone-300 px-4 font-bold text-stone-800"
          >
            Desconectar
          </button>
          <button
            type="button"
            onClick={logBytes}
            className="min-h-12 rounded-xl border border-stone-300 px-4 font-bold text-stone-800"
          >
            Ver bytes generados
          </button>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-stone-900">Log</h2>
            <button
              type="button"
              onClick={() => setLog([])}
              className="min-h-10 rounded-full border border-stone-300 px-3 text-xs font-bold text-stone-700"
            >
              Limpiar
            </button>
          </div>
          <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-stone-950 p-3 text-xs text-stone-100">
            {log.length ? log.join("\n") : "Sin eventos."}
          </pre>
        </section>
      </div>
    </main>
  );
}
