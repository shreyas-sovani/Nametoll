import { encodePaymentSignatureHeader } from "@x402/core/http";
import type { PaymentRequirements } from "@x402/core/types";
import { describe, expect, it } from "vitest";
import { createMemoryLedger } from "../src/modules/ledger/index.ts";
import {
  decodeChallenge,
  paymentOffers,
  startDesk,
  startFakeFacilitator,
} from "./helpers.ts";

describe("ledger", () => {
  it("does not append a bill for an unpaid challenge", async () => {
    const ledger = createMemoryLedger();
    const desk = await startDesk({}, undefined, { ledger });
    try {
      const res = await fetch(`${desk.url}/desk/snapshot`, {
        headers: { accept: "application/json" },
      });
      expect(res.status).toBe(402);
      expect(ledger.bills).toHaveLength(0);
    } finally {
      await desk.close();
    }
  });

  it("appends a recompute-shaped bill after a successful settle", async () => {
    const ledger = createMemoryLedger();
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk({ facilitatorUrl: facilitator.url }, undefined, {
      ledger,
    });
    try {
      const challenged = await fetch(`${desk.url}/desk/snapshot`, {
        headers: { accept: "application/json" },
      });
      const offer = paymentOffers(
        decodeChallenge(challenged.headers.get("payment-required")!),
      )[0] as PaymentRequirements | undefined;

      const paid = await fetch(`${desk.url}/desk/snapshot`, {
        headers: {
          accept: "application/json",
          "payment-signature": encodePaymentSignatureHeader({
            x402Version: 2,
            accepted: offer!,
            payload: { transaction: Buffer.from("stub-tx").toString("base64") },
          }),
        },
      });
      expect(paid.status).toBe(200);
      expect(await paid.json()).toEqual({
        ok: true,
        stub: true,
        units: 2,
        protocols: [],
      });

      expect(ledger.bills).toHaveLength(1);
      const bill = ledger.bills[0]!;
      expect(bill.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(bill.name).toBe("stub");
      expect(bill.units).toBe(2);
      expect(bill.tinybars).toBe("200000");
      expect(bill.settleTx).toBe("0.0.1@1234567890.000000001");
      expect(bill.consensusTime).toMatch(/^\d+\.\d+$/);
      expect(BigInt(bill.units) * 100000n).toBe(BigInt(bill.tinybars));

      const listed = await fetch(`${desk.url}/desk/ledger`);
      expect(listed.status).toBe(200);
      const body = (await listed.json()) as {
        topicId?: string;
        hashscanUrl?: string;
        priceTinybarsPerUnit?: string;
        recompute?: string;
        bills?: Array<Record<string, unknown>>;
      };
      expect(body.topicId).toBe(ledger.topicId);
      expect(body.hashscanUrl).toMatch(/\/topic\//);
      expect(body.priceTinybarsPerUnit).toBe("100000");
      expect(body.recompute).toMatch(/units \* priceTinybarsPerUnit = tinybars/i);
      expect(body.bills).toHaveLength(1);
      expect(body.bills?.[0]).toMatchObject({
        requestId: bill.requestId,
        name: "stub",
        units: 2,
        tinybars: "200000",
        settleTx: bill.settleTx,
      });
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });
});
