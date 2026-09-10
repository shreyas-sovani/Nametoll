import { PrivateKey } from "@hiero-ledger/sdk";
import { describe, expect, it } from "vitest";
import { createBuyer, loadBuyerCredentials } from "../src/modules/buyer/index.ts";
import { startDesk, startFakeFacilitator } from "./helpers.ts";

describe("buyer", () => {
  it("does not load a seller private key", () => {
    const credentials = loadBuyerCredentials({
      HEDERA_BUYER_ACCOUNT_ID: "0.0.111",
      HEDERA_BUYER_PRIVATE_KEY: "0xabc",
      HEDERA_SELLER_PRIVATE_KEY: "0xSELLER",
      HEDERA_SELLER_ACCOUNT_ID: "0.0.222",
    });
    expect(credentials.accountId).toBe("0.0.111");
    expect(JSON.stringify(credentials)).not.toMatch(/SELLER|0xSELLER|0\.0\.222/);
  });

  it("completes one paid snapshot against the gate", async () => {
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk({ facilitatorUrl: facilitator.url });
    try {
      const key = PrivateKey.generateECDSA();
      const buyer = createBuyer({
        accountId: "0.0.1",
        privateKey: `0x${key.toStringRaw()}`,
        network: "hedera:testnet",
      });
      const result = await buyer.payOnce(desk.url);
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ ok: true, stub: true });
      expect(result.settleTx).toBe("0.0.1@1234567890.000000001");
      expect(result.hashscanUrl).toBe(
        "https://hashscan.io/testnet/tx/0.0.1@1234567890.000000001",
      );
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });
});
