import { PrivateKey } from "@hiero-ledger/sdk";
import { describe, expect, it } from "vitest";
import { HBAR_ASSET } from "../src/config.ts";
import { discoverAndPay } from "../src/modules/buyer/agent.ts";
import { createBuyer } from "../src/modules/buyer/index.ts";
import { createDirectory, DESK_TEXT_KEYS } from "../src/modules/directory/index.ts";
import { startDesk, startFakeFacilitator, testDeskConfig } from "./helpers.ts";

const PARENT = "parent-fixture.test";
const CHEAP = "cheap.parent-fixture.test";
const DEAR = "dear.parent-fixture.test";

function texts(endpoint: string, priceRule: string): Record<string, string> {
  return {
    [DESK_TEXT_KEYS.agentEndpointWeb]: endpoint,
    [DESK_TEXT_KEYS.agentContext]: JSON.stringify({
      payTo: "0.0.10463755",
      priceRule,
      hcsTopic: "0.0.10464309",
      asset: HBAR_ASSET,
    }),
  };
}

describe("discoverAndPay", () => {
  it("refuses to invent a parent name", async () => {
    await expect(
      discoverAndPay("  ", {
        directory: createDirectory({ fetchTexts: async () => ({}) }),
        listChildren: async () => [CHEAP],
        brain: { async decide() { return { allow: true, maxTinybars: "100000", reason: "under cap" }; } },
        buyer: createBuyer({
          accountId: "0.0.1",
          privateKey: `0x${PrivateKey.generateECDSA().toStringRaw()}`,
          network: "hedera:testnet",
        }),
        config: testDeskConfig(),
      }),
    ).rejects.toThrow(/parent/i);
  });

  it("enumerates children, picks the cheapest live desk, then pays it", async () => {
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk({ facilitatorUrl: facilitator.url });
    try {
      const directory = createDirectory({
        fetchTexts: async (name) => {
          if (name === CHEAP) return texts(desk.url, "100000 tinybars per protocol");
          if (name === DEAR) return texts("https://dear.example", "200000 tinybars per protocol");
          return {};
        },
      });
      const asked: string[] = [];
      const buyer = createBuyer({
        accountId: "0.0.1",
        privateKey: `0x${PrivateKey.generateECDSA().toStringRaw()}`,
        network: "hedera:testnet",
      });
      const result = await discoverAndPay(PARENT, {
        directory,
        listChildren: async (name) => {
          expect(name).toBe(PARENT);
          return [DEAR, CHEAP];
        },
        probe: async (endpoint) => ({
          reachable: true,
          protocols: ["aave-v3-ethereum"],
        }),
        brain: {
          async decide({ requestedTinybars }) {
            asked.push(requestedTinybars);
            return { allow: true, maxTinybars: requestedTinybars, reason: "under cap" };
          },
        },
        buyer,
        config: testDeskConfig({ facilitatorUrl: facilitator.url }),
      }, { protocols: ["aave-v3-ethereum"] });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.parent).toBe(PARENT);
      expect(result.chosen.name).toBe(CHEAP);
      expect(result.considered.map((row) => row.name)).toEqual([DEAR, CHEAP]);
      expect(result.result.paid.status).toBe(200);
      expect(result.result.paid.settleTx).toBeTruthy();
      expect(asked.length).toBeGreaterThan(0);
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });

  it("skips a child pinned away from this origin and pays the next live desk", async () => {
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk({ facilitatorUrl: facilitator.url });
    try {
      const directory = createDirectory({
        fetchTexts: async (name) => {
          if (name === CHEAP) return texts("https://blocked.example", "100000 tinybars per protocol");
          if (name === DEAR) return texts(desk.url, "200000 tinybars per protocol");
          return {};
        },
      });
      const result = await discoverAndPay(PARENT, {
        directory,
        listChildren: async () => [CHEAP, DEAR],
        probe: async () => ({ reachable: true, protocols: ["aave-v3-ethereum"] }),
        brain: {
          async decide({ requestedTinybars }) {
            return { allow: true, maxTinybars: requestedTinybars, reason: "under cap" };
          },
        },
        buyer: createBuyer({
          accountId: "0.0.1",
          privateKey: `0x${PrivateKey.generateECDSA().toStringRaw()}`,
          network: "hedera:testnet",
        }),
        config: testDeskConfig({ facilitatorUrl: facilitator.url, publicDeskUrl: desk.url }),
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.chosen.name).toBe(DEAR);
      expect(result.result.paid.status).toBe(200);
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });
});
