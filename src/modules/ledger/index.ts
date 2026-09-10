import type { Bill } from "../../types.ts";

export type Ledger = {
  append(bill: Bill): Promise<void>;
};

export function createLedger(): Ledger {
  return {
    async append() {
      throw new Error("Ledger is not wired yet (HCS, B4).");
    },
  };
}
