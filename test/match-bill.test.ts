import { describe, expect, it } from "vitest";
import { waitForMatchingBill } from "../src/modules/ledger/match-bill.ts";
import type { Bill } from "../src/types.ts";
import type { Ledger } from "../src/modules/ledger/index.ts";

const OLD: Bill = {
  requestId: "11111111-1111-4111-8111-111111111111",
  name: "old",
  units: 2,
  tinybars: "200000",
  settleTx: "0.0.1@1111111111.000000001",
  consensusTime: "1.0",
};

const MATCH: Bill = {
  requestId: "22222222-2222-4222-8222-222222222222",
  name: "lending-risk",
  units: 1,
  tinybars: "100000",
  settleTx: "0.0.1@1234567890.000000001",
  consensusTime: "2.0",
};

function sequenceLedger(pages: Bill[][]): Ledger {
  let i = 0;
  return {
    topicId: "0.0.10464309",
    async list() {
      const page = pages[Math.min(i, pages.length - 1)] ?? [];
      i += 1;
      return page;
    },
    async append() {
      throw new Error("unused");
    },
  };
}

describe("waitForMatchingBill", () => {
  it("returns the bill whose settleTx matches and never the newest unrelated row", async () => {
    const bill = await waitForMatchingBill(
      sequenceLedger([[OLD], [OLD]]),
      MATCH.settleTx,
      { timeoutMs: 0, intervalMs: 0 },
    );
    expect(bill).toBeUndefined();
  });

  it("retries until the matching settleTx appears", async () => {
    const bill = await waitForMatchingBill(
      sequenceLedger([[OLD], [OLD, MATCH]]),
      MATCH.settleTx,
      { timeoutMs: 200, intervalMs: 1 },
    );
    expect(bill?.settleTx).toBe(MATCH.settleTx);
    expect(bill?.name).toBe("lending-risk");
  });
});
