import { describe, expect, it } from "vitest";
import { hashscanTransactionUrl } from "../src/modules/buyer/hashscan.ts";

describe("hashscan", () => {
  it("turns a Hedera transaction id into a testnet explorer URL", () => {
    expect(hashscanTransactionUrl("0.0.7162784@1234567890.000000001")).toBe(
      "https://hashscan.io/testnet/tx/0.0.7162784@1234567890.000000001",
    );
  });
});
