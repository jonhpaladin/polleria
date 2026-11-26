import { useCallback, useEffect, useState } from "react";

import { getPrinterService, type PrinterService } from "@/printer/PrinterService";
import type { LocalTicket } from "@/types/sale";
import type { PrinterCodepage, PrinterConnectionType, PrinterState, PrintJob, PrintTicket } from "@/types/print";

export interface UsePrinterResult {
  state: PrinterState;
  connect: (type: PrinterConnectionType) => Promise<void>;
  reconnect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  printTicket: (ticket: LocalTicket, reason?: "sale" | "reprint") => Promise<void>;
  printTest: () => Promise<void>;
  printWithSystem: (ticket: PrintTicket) => Promise<void>;
  printTicketWithSystem: (ticket: LocalTicket) => Promise<void>;
  retryFailed: (id: number) => Promise<void>;
  retryUncertain: (id: number) => Promise<void>;
  discard: (id: number) => Promise<void>;
  listAttentionJobs: () => Promise<PrintJob[]>;
  setCodepage: (codepage: PrinterCodepage) => void;
}

export function usePrinter(service: PrinterService = getPrinterService()): UsePrinterResult {
  const [state, setState] = useState<PrinterState>(() => service.getState());

  useEffect(() => {
    const unsubscribe = service.subscribe(setState);
    void service.initialize();
    return unsubscribe;
  }, [service]);

  const connect = useCallback((type: PrinterConnectionType) => service.connect(type), [service]);
  const reconnect = useCallback(() => service.reconnect(), [service]);
  const disconnect = useCallback(() => service.disconnect(), [service]);
  const printTicket = useCallback(
    (ticket: LocalTicket, reason: "sale" | "reprint" = "sale") =>
      service.printTicket(ticket, reason),
    [service],
  );
  const printTest = useCallback(() => service.printTest(), [service]);
  const printWithSystem = useCallback(
    (ticket: PrintTicket) => service.printWithSystem(ticket),
    [service],
  );
  const printTicketWithSystem = useCallback(
    (ticket: LocalTicket) => service.printTicketWithSystem(ticket),
    [service],
  );
  const retryFailed = useCallback((id: number) => service.retryFailed(id), [service]);
  const retryUncertain = useCallback((id: number) => service.retryUncertain(id), [service]);
  const discard = useCallback((id: number) => service.discard(id), [service]);
  const listAttentionJobs = useCallback(() => service.listAttentionJobs(), [service]);
  const setCodepage = useCallback(
    (codepage: PrinterCodepage) => service.setCodepage(codepage),
    [service],
  );

  return {
    state,
    connect,
    reconnect,
    disconnect,
    printTicket,
    printTest,
    printWithSystem,
    printTicketWithSystem,
    retryFailed,
    retryUncertain,
    discard,
    listAttentionJobs,
    setCodepage,
  };
}
