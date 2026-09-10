import { describe, expect, it } from "vitest";
import {
  LENDING_RISK_QUERY,
  createMerchandise,
  gatewayErrorsRejected,
  type GraphFetcher,
} from "../src/modules/merchandise/index.ts";
import { PINNED_PROTOCOLS } from "../src/modules/merchandise/deployments.ts";

const liveAave = {
  lendingProtocols: [
    {
      id: "0xaave",
      name: "Aave v3",
      slug: "aave-v3",
      network: "MAINNET",
      schemaVersion: "3.1.0",
      totalValueLockedUSD: "1000",
      totalDepositBalanceUSD: "800",
      totalBorrowBalanceUSD: "400",
    },
  ],
  markets: [
    {
      id: "0xmarket",
      name: "WETH",
      isActive: true,
      maximumLTV: "80",
      liquidationThreshold: "82.5",
      totalValueLockedUSD: "500",
      totalDepositBalanceUSD: "500",
      totalBorrowBalanceUSD: "200",
      inputToken: { id: "0xweth", symbol: "WETH" },
    },
  ],
};

describe("merchandise", () => {
  it("treats gateway auth failures as a rejected key", () => {
    expect(gatewayErrorsRejected([{ message: "auth error: API key not found" }])).toBe(
      true,
    );
    expect(gatewayErrorsRejected([{ message: "indexer unavailable" }])).toBe(false);
  });

  it("pins two Standardized lending subgraphs", () => {
    expect(PINNED_PROTOCOLS).toHaveLength(2);
    expect(PINNED_PROTOCOLS.map((p) => p.id)).toEqual([
      "aave-v3-ethereum",
      "compound-v3-ethereum",
    ]);
  });

  it("uses one Messari lending query (no invented entities)", () => {
    expect(LENDING_RISK_QUERY).toMatch(/lendingProtocols/);
    expect(LENDING_RISK_QUERY).toMatch(/totalBorrowBalanceUSD/);
    expect(LENDING_RISK_QUERY).not.toMatch(/fakeMarket|madeUpEntity/i);
  });

  it("fail-softs when one protocol indexer is down and does not invent rows", async () => {
    const fetchGraph: GraphFetcher = async (subgraphId) => {
      if (subgraphId === PINNED_PROTOCOLS[0]?.subgraphId) return liveAave;
      throw new Error("indexer unavailable");
    };
    const merchandise = createMerchandise({ fetchGraph, gatewayKey: "test" });
    const snap = await merchandise.snapshot();
    expect(snap.stub).toBeUndefined();
    expect(snap.units).toBe(2);
    expect(snap.protocols).toHaveLength(2);
    const aave = snap.protocols.find((p) => p.id === "aave-v3-ethereum");
    const compound = snap.protocols.find((p) => p.id === "compound-v3-ethereum");
    expect(aave?.ok).toBe(true);
    expect(aave?.lendingProtocols?.[0]?.name).toBe("Aave v3");
    expect(compound?.ok).toBe(false);
    expect(compound?.error).toMatch(/indexer unavailable/);
    expect(compound?.lendingProtocols).toBeUndefined();
    expect(compound?.markets).toBeUndefined();
  });

  it("prices the requested protocol count even when one indexer fails", async () => {
    const fetchGraph: GraphFetcher = async () => liveAave;
    const merchandise = createMerchandise({ fetchGraph, gatewayKey: "test" });
    const one = await merchandise.snapshot(["aave-v3-ethereum"]);
    const two = await merchandise.snapshot([
      "aave-v3-ethereum",
      "compound-v3-ethereum",
    ]);
    expect(one.units).toBe(1);
    expect(two.units).toBe(2);
  });

  it("refuses unknown protocol ids instead of inventing a subgraph", async () => {
    const merchandise = createMerchandise({
      fetchGraph: async () => liveAave,
      gatewayKey: "test",
    });
    const snap = await merchandise.snapshot(["not-a-real-protocol"]);
    expect(snap.units).toBe(1);
    expect(snap.protocols[0]?.ok).toBe(false);
    expect(snap.protocols[0]?.error).toMatch(/not pinned/i);
  });
});
