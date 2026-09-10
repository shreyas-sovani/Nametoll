import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrivateKey } from "@hiero-ledger/sdk";
import { describe, expect, it } from "vitest";
import { HBAR_ASSET } from "../src/config.ts";
import { createBuyer, loadBuyerCredentials } from "../src/modules/buyer/index.ts";
import { buyerTargetFromArgv } from "../src/modules/buyer/target.ts";
import { createDirectory } from "../src/modules/directory/index.ts";
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
      expect(result.body).toEqual({ ok: true, stub: true, units: 2, protocols: [] });
      expect(result.settleTx).toBe("0.0.1@1234567890.000000001");
      expect(result.hashscanUrl).toBe(
        "https://hashscan.io/testnet/tx/0.0.1@1234567890.000000001",
      );
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });

  it("pays the endpoint resolved from a name, not a baked-in URL", async () => {
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk({ facilitatorUrl: facilitator.url });
    try {
      const key = PrivateKey.generateECDSA();
      const buyer = createBuyer({
        accountId: "0.0.1",
        privateKey: `0x${key.toStringRaw()}`,
        network: "hedera:testnet",
      });
      const directory = createDirectory({
        fetchTexts: async () => ({
          url: desk.url,
          "agent-context": JSON.stringify({
            payTo: "0.0.10463755",
            priceRule: "100000 tinybars per protocol",
            hcsTopic: "0.0.10464309",
            asset: HBAR_ASSET,
          }),
        }),
      });
      const result = await buyer.payFromName("desk-fixture.test", directory);
      expect(result.status).toBe(200);
      expect(result.descriptor.endpoint).toBe(desk.url.replace(/\/+$/, ""));
      expect(result.name).toBe("desk-fixture.test");
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });

  it("treats a name argv as the demo input and a URL as the B2 path", () => {
    expect(buyerTargetFromArgv(["node", "cli", "desk-fixture.test"])).toEqual({
      kind: "name",
      value: "desk-fixture.test",
    });
    expect(buyerTargetFromArgv(["node", "cli", "http://127.0.0.1:8787"])).toEqual({
      kind: "url",
      value: "http://127.0.0.1:8787",
    });
    expect(buyerTargetFromArgv(["node", "cli"])).toBeUndefined();
  });

  it("does not bake a name or desk URL into buyer source", () => {
    const buyer = readFileSync(resolve(process.cwd(), "src/modules/buyer/index.ts"), "utf8");
    const cli = readFileSync(resolve(process.cwd(), "src/modules/buyer/cli.ts"), "utf8");
    expect(`${buyer}\n${cli}`).not.toMatch(/\.eth\b/);
    expect(buyer).not.toMatch(/127\.0\.0\.1|localhost|PUBLIC_DESK_URL/);
  });
});
