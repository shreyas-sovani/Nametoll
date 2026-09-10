import { describe, expect, it } from "vitest";
import { encodePaymentSignatureHeader } from "@x402/core/http";
import type { PaymentRequirements } from "@x402/core/types";
import { createMemoryLedger } from "../src/modules/ledger/index.ts";
import { meterTinybars, requestedUnits } from "../src/modules/gate/meter.ts";
import {
  decodeChallenge,
  paymentOffers,
  startDesk,
  startFakeFacilitator,
} from "./helpers.ts";

describe("meter", () => {
  it("prices the requested protocol count", () => {
    expect(requestedUnits()).toBe(2);
    expect(requestedUnits(["aave-v3-ethereum"])).toBe(1);
    expect(meterTinybars("100000", 1)).toBe("100000");
    expect(meterTinybars("100000", 2)).toBe("200000");
  });

  it("challenges one protocol cheaper than two", async () => {
    const desk = await startDesk();
    try {
      const one = await fetch(
        `${desk.url}/desk/snapshot?protocols=aave-v3-ethereum`,
        { headers: { accept: "application/json" } },
      );
      const two = await fetch(
        `${desk.url}/desk/snapshot?protocols=aave-v3-ethereum,compound-v3-ethereum`,
        { headers: { accept: "application/json" } },
      );
      expect(one.status).toBe(402);
      expect(two.status).toBe(402);
      const oneOffer = paymentOffers(
        decodeChallenge(one.headers.get("payment-required")!),
      )[0];
      const twoOffer = paymentOffers(
        decodeChallenge(two.headers.get("payment-required")!),
      )[0];
      expect(oneOffer?.amount).toBe("100000");
      expect(twoOffer?.amount).toBe("200000");
    } finally {
      await desk.close();
    }
  });

  it("writes different HCS tinybars for one vs two protocol settles", async () => {
    const ledger = createMemoryLedger();
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk({ facilitatorUrl: facilitator.url }, undefined, {
      ledger,
    });
    try {
      for (const [query, amount] of [
        ["protocols=aave-v3-ethereum", "100000"],
        ["protocols=aave-v3-ethereum,compound-v3-ethereum", "200000"],
      ] as const) {
        const challenged = await fetch(`${desk.url}/desk/snapshot?${query}`, {
          headers: { accept: "application/json" },
        });
        const offer = paymentOffers(
          decodeChallenge(challenged.headers.get("payment-required")!),
        )[0] as PaymentRequirements | undefined;
        expect(offer?.amount).toBe(amount);
        const paid = await fetch(`${desk.url}/desk/snapshot?${query}`, {
          headers: {
            accept: "application/json",
            "payment-signature": encodePaymentSignatureHeader({
              x402Version: 2,
              accepted: offer!,
              payload: { transaction: Buffer.from(query).toString("base64") },
            }),
          },
        });
        expect(paid.status).toBe(200);
      }
      expect(ledger.bills.map((bill) => bill.tinybars)).toEqual([
        "100000",
        "200000",
      ]);
      expect(ledger.bills.map((bill) => bill.units)).toEqual([1, 2]);
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });
});
