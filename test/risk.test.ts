import { describe, expect, it } from "vitest";
import {
  encodePaymentSignatureHeader,
} from "@x402/core/http";
import type { PaymentRequirements } from "@x402/core/types";
import { createBrain, type Brain } from "../src/modules/brain/index.ts";
import { createMemoryLedger } from "../src/modules/ledger/index.ts";
import { createMerchandise } from "../src/modules/merchandise/index.ts";
import { PINNED_PROTOCOLS } from "../src/modules/merchandise/deployments.ts";
import {
  accountPositionsQuery,
  demoPortfolio,
  parseWallet,
  RISK_SKU,
  scoreRisk,
} from "../src/modules/merchandise/risk.ts";
import {
  decodeChallenge,
  paymentOffers,
  startDesk,
  startFakeFacilitator,
} from "./helpers.ts";

const WALLET_A = "0x1111111111111111111111111111111111111111";
const WALLET_B = "0x2222222222222222222222222222222222222222";

const markets = [
  {
    id: "0xweth",
    name: "WETH",
    protocol: "Aave v3 Ethereum",
    maximumLTV: "80",
    liquidationThreshold: "82.5",
    totalValueLockedUSD: "500",
  },
  {
    id: "0xusdc",
    name: "USDC",
    protocol: "Compound III",
    maximumLTV: "75",
    liquidationThreshold: "80",
    totalValueLockedUSD: "300",
  },
];

describe("risk score compute", () => {
  it("rejects a non-address wallet", () => {
    expect(parseWallet("not-a-wallet")).toBeUndefined();
    expect(parseWallet("0xabc")).toBeUndefined();
    expect(parseWallet(WALLET_A)).toBe("0x1111111111111111111111111111111111111111");
  });

  it("is deterministic per wallet and changes when the wallet changes", () => {
    const a = scoreRisk({ wallet: WALLET_A, markets });
    const b = scoreRisk({ wallet: WALLET_B, markets });
    expect(a.sku).toBe(RISK_SKU);
    expect(a.source).toBe("demo-portfolio");
    expect(a.units).toBe(1);
    expect(a.methodology).toMatch(/not private/i);
    expect(a.healthFactor).not.toBe(b.healthFactor);
    expect(demoPortfolio(WALLET_A, markets)).toEqual(demoPortfolio(WALLET_A, markets));
  });

  it("uses live positions when the indexer has them", () => {
    const scored = scoreRisk({
      wallet: WALLET_A,
      markets,
      positions: [
        {
          marketId: "0xweth",
          marketName: "WETH",
          protocol: "Aave v3 Ethereum",
          side: "COLLATERAL",
          balanceUsd: "1000",
          liquidationThreshold: "80",
        },
        {
          marketId: "0xweth",
          marketName: "WETH",
          protocol: "Aave v3 Ethereum",
          side: "BORROWER",
          balanceUsd: "400",
          liquidationThreshold: "80",
        },
      ],
    });
    expect(scored.source).toBe("positions");
    expect(Number(scored.healthFactor)).toBeCloseTo(2, 4);
    expect(scored.worstMarket?.id).toBe("0xweth");
  });

  it("does not invent Graph entities in the account query", () => {
    const query = accountPositionsQuery(WALLET_A);
    expect(query).toMatch(/account\(id:/);
    expect(query).toMatch(/positions/);
    expect(query).toMatch(/snapshots/);
    expect(query).toMatch(/balanceUSD/);
    expect(query).toMatch(/liquidationThreshold/);
    expect(query).not.toMatch(/fakeMarket|madeUpEntity|healthFactor/i);
  });
});

describe("risk score gate", () => {
  const allow: Brain = {
    async decide({ requestedTinybars }) {
      return { allow: true, maxTinybars: requestedTinybars, reason: "under cap" };
    },
  };

  it("challenges unpaid GET /desk/risk at 1 unit and bills sku risk-score", async () => {
    const ledger = createMemoryLedger();
    const merchandise = createMerchandise({
      fetchGraph: async () => ({
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
      }),
      gatewayKey: "test",
    });
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk(
      { facilitatorUrl: facilitator.url },
      undefined,
      { ledger, merchandise, brain: allow },
    );
    try {
      const missing = await fetch(`${desk.url}/desk/risk`);
      expect(missing.status).toBe(400);
      const unpaid = await fetch(`${desk.url}/desk/risk?wallet=${WALLET_A}`, {
        headers: { accept: "application/json" },
      });
      expect(unpaid.status).toBe(402);
      const offer = paymentOffers(
        decodeChallenge(unpaid.headers.get("payment-required")!),
      )[0] as PaymentRequirements;
      expect(String(offer.amount)).toBe("100000");
      const paid = await fetch(`${desk.url}/desk/risk?wallet=${WALLET_A}`, {
        headers: {
          accept: "application/json",
          "payment-signature": encodePaymentSignatureHeader({
            x402Version: 2,
            accepted: offer,
            payload: { transaction: Buffer.from("risk-pay").toString("base64") },
          }),
        },
      });
      expect(paid.status).toBe(200);
      const body = (await paid.json()) as { sku?: string; wallet?: string; units?: number };
      expect(body.sku).toBe(RISK_SKU);
      expect(body.wallet).toBe(WALLET_A);
      expect(body.units).toBe(1);
      expect(ledger.bills[0]?.sku).toBe(RISK_SKU);
      expect(ledger.bills[0]?.name).toBe(RISK_SKU);
      expect(ledger.bills[0]?.units).toBe(1);
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });

  it("does not re-ask the TEE when only the wallet changes", async () => {
    let calls = 0;
    const brain = createBrain({
      ask: async ({ requestedTinybars }) => {
        calls += 1;
        return { allow: true, maxTinybars: requestedTinybars, reason: "under cap" };
      },
    });
    const merchandise = createMerchandise();
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk(
      { facilitatorUrl: facilitator.url },
      undefined,
      { merchandise, brain },
    );
    try {
      const first = await fetch(`${desk.url}/desk/risk?wallet=${WALLET_A}`, {
        headers: { accept: "application/json" },
      });
      const offer = paymentOffers(
        decodeChallenge(first.headers.get("payment-required")!),
      )[0] as PaymentRequirements;
      await fetch(`${desk.url}/desk/risk?wallet=${WALLET_A}`, {
        headers: {
          accept: "application/json",
          "payment-signature": encodePaymentSignatureHeader({
            x402Version: 2,
            accepted: offer,
            payload: { transaction: Buffer.from("a").toString("base64") },
          }),
        },
      });
      const afterFirstPay = calls;
      await fetch(`${desk.url}/desk/risk?wallet=${WALLET_B}`, {
        headers: {
          accept: "application/json",
          "payment-signature": encodePaymentSignatureHeader({
            x402Version: 2,
            accepted: offer,
            payload: { transaction: Buffer.from("b").toString("base64") },
          }),
        },
      });
      expect(calls).toBe(afterFirstPay);
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });

  it("lists the risk SKU on the catalog offer", async () => {
    const desk = await startDesk();
    try {
      const offer = (await (await fetch(`${desk.url}/desk/offer`)).json()) as {
        skus?: Array<{ id?: string }>;
      };
      expect(offer.skus?.some((row) => row.id === RISK_SKU)).toBe(true);
      expect(PINNED_PROTOCOLS).toHaveLength(2);
    } finally {
      await desk.close();
    }
  });
});
