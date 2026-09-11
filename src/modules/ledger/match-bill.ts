import type { Bill } from "../../types.ts";
import type { Ledger } from "./index.ts";

export const BILL_MATCH_TIMEOUT_MS = 5_000;
export const BILL_MATCH_INTERVAL_MS = 250;

export type BillMatchOptions = {
  timeoutMs?: number;
  intervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitForMatchingBill(
  ledger: Ledger | undefined,
  settleTx: string,
  options: BillMatchOptions = {},
): Promise<Bill | undefined> {
  if (!ledger) return undefined;
  const timeoutMs = options.timeoutMs ?? BILL_MATCH_TIMEOUT_MS;
  const intervalMs = options.intervalMs ?? BILL_MATCH_INTERVAL_MS;
  const sleep = options.sleep ?? delay;
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const bills = await ledger.list();
    const hit = bills.find((row) => row.settleTx === settleTx);
    if (hit) return hit;
    if (Date.now() >= deadline) return undefined;
    await sleep(intervalMs);
  }
}
