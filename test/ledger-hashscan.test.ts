import { describe, expect, it } from "vitest";
import { hashscanTopicUrl } from "../src/modules/ledger/hashscan.ts";

describe("hashscan topic", () => {
  it("turns a topic id into a testnet explorer URL", () => {
    expect(hashscanTopicUrl("0.0.4603900")).toBe(
      "https://hashscan.io/testnet/topic/0.0.4603900",
    );
  });
});
