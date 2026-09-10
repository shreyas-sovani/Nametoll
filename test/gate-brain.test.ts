import { describe, expect, it } from "vitest";
import { encodePaymentSignatureHeader } from "@x402/core/http";
import type { PaymentRequirements } from "@x402/core/types";
import type { Brain } from "../src/modules/brain/index.ts";
import { createMemoryLedger } from "../src/modules/ledger/index.ts";
import type { Merchandise } from "../src/modules/merchandise/index.ts";
import {
  decodeChallenge,
  paymentOffers,
  startDesk,
  startFakeFacilitator,
} from "./helpers.ts";

const denyOverCap: Brain = {
  async decide() {
    return { allow: false, maxTinybars: "150000", reason: "over cap" };
  },
};

const allowUnderCap: Brain = {
  async decide({ requestedTinybars }) {
    return {
      allow: true,
      maxTinybars: "200000",
      reason: "under cap",
    };
  },
};

const skipBrain: Brain = {
  async decide() {
    throw new Error("Brain must not be skipped");
  },
};

function countingMerchandise(): Merchandise & { calls: number } {
  const merchandise = {
    calls: 0,
    async snapshot() {
      merchandise.calls += 1;
      return { ok: true, stub: true as const, units: 2, protocols: [] };
    },
  };
  return merchandise;
}

async function paySnapshot(
  url: string,
  query = "",
): Promise<{ status: number; body: string; settleHeader: string | null }> {
  const challenged = await fetch(`${url}/desk/snapshot${query}`, {
    headers: { accept: "application/json" },
  });
  const offer = paymentOffers(
    decodeChallenge(challenged.headers.get("payment-required")!),
  )[0] as PaymentRequirements | undefined;
  const paid = await fetch(`${url}/desk/snapshot${query}`, {
    headers: {
      accept: "application/json",
      "payment-signature": encodePaymentSignatureHeader({
        x402Version: 2,
        accepted: offer!,
        payload: { transaction: Buffer.from("brain-pay").toString("base64") },
      }),
    },
  });
  return {
    status: paid.status,
    body: await paid.text(),
    settleHeader: paid.headers.get("payment-response"),
  };
}

describe("gate obeys the brain", () => {
  it("lets the desk ask the brain without paying", async () => {
    const desk = await startDesk({}, undefined, { brain: allowUnderCap });
    try {
      const res = await fetch(`${desk.url}/desk/brain?tinybars=100000`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        ok: true,
        allow: true,
        maxTinybars: "200000",
        reason: "under cap",
      });
    } finally {
      await desk.close();
    }
  });

  it("does not settle or return merchandise when the TEE denies", async () => {
    const ledger = createMemoryLedger();
    const merchandise = countingMerchandise();
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk(
      { facilitatorUrl: facilitator.url },
      undefined,
      { ledger, merchandise, brain: denyOverCap },
    );
    try {
      const paid = await paySnapshot(desk.url);
      expect(paid.status).not.toBe(200);
      expect(paid.settleHeader).toBeNull();
      expect(paid.body).not.toMatch(/"stub":\s*true/);
      expect(merchandise.calls).toBe(0);
      expect(ledger.bills).toHaveLength(0);
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });

  it("settles only when the TEE allows and the amount is at or under maxTinybars", async () => {
    const ledger = createMemoryLedger();
    const merchandise = countingMerchandise();
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk(
      { facilitatorUrl: facilitator.url },
      undefined,
      { ledger, merchandise, brain: allowUnderCap },
    );
    try {
      const paid = await paySnapshot(desk.url);
      expect(paid.status).toBe(200);
      expect(paid.settleHeader).toBeTruthy();
      expect(JSON.parse(paid.body)).toEqual({
        ok: true,
        stub: true,
        units: 2,
        protocols: [],
      });
      expect(merchandise.calls).toBe(1);
      expect(ledger.bills).toHaveLength(1);
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });

  it("does not settle when the TEE is skipped", async () => {
    const ledger = createMemoryLedger();
    const merchandise = countingMerchandise();
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk(
      { facilitatorUrl: facilitator.url },
      undefined,
      { ledger, merchandise, brain: skipBrain },
    );
    try {
      const paid = await paySnapshot(desk.url);
      expect(paid.status).not.toBe(200);
      expect(merchandise.calls).toBe(0);
      expect(ledger.bills).toHaveLength(0);
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });
});
