import { describe, expect, it } from "vitest";
import {
  billFromMirrorMessage,
  billMatchesPrice,
} from "../src/modules/ledger/index.ts";

describe("mirror bill", () => {
  it("rebuilds a bill from a Mirror Node topic message", () => {
    const payload = {
      requestId: "11111111-1111-4111-8111-111111111111",
      name: "stub",
      units: 2,
      tinybars: "200000",
      settleTx: "0.0.1@1234567890.000000001",
    };
    const bill = billFromMirrorMessage({
      consensus_timestamp: "1683553059.977315003",
      message: Buffer.from(JSON.stringify(payload), "utf8").toString("base64"),
    });
    expect(bill).toEqual({
      ...payload,
      consensusTime: "1683553059.977315003",
    });
    expect(billMatchesPrice(bill!, "100000")).toBe(true);
  });

  it("keeps an optional TEE verdict reason and hash without changing recompute", () => {
    const payload = {
      requestId: "11111111-1111-4111-8111-111111111111",
      name: "stub",
      units: 1,
      tinybars: "100000",
      settleTx: "0.0.1@1234567890.000000001",
      verdictReason: "under cap",
      verdictHash: "abc123",
    };
    const bill = billFromMirrorMessage({
      consensus_timestamp: "1683553059.977315003",
      message: Buffer.from(JSON.stringify(payload), "utf8").toString("base64"),
    });
    expect(bill?.verdictReason).toBe("under cap");
    expect(bill?.verdictHash).toBe("abc123");
    expect(billMatchesPrice(bill!, "100000")).toBe(true);
  });

  it("ignores a message that is not a nametoll bill", () => {
    expect(
      billFromMirrorMessage({
        consensus_timestamp: "1.0",
        message: Buffer.from("hello", "utf8").toString("base64"),
      }),
    ).toBeUndefined();
  });
});
