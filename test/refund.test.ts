import { encodePaymentSignatureHeader } from "@x402/core/http";
import type { PaymentRequirements } from "@x402/core/types";
import { describe, expect, it } from "vitest";
import { createMemoryLedger } from "../src/modules/ledger/index.ts";
import type { Merchandise } from "../src/modules/merchandise/index.ts";
import {
  decodeChallenge,
  paymentOffers,
  startDesk,
  startFakeFacilitator,
} from "./helpers.ts";

const FAIL_SOFT_QUERY =
  "protocols=aave-v3-ethereum,compound-v3-ethereum";

function failSoftMerchandise(): Merchandise {
  return {
    async snapshot(protocolIds) {
      const ids = protocolIds?.length
        ? protocolIds
        : ["aave-v3-ethereum", "compound-v3-ethereum"];
      return {
        ok: true,
        units: ids.length,
        protocols: ids.map((id, index) =>
          index === 0
            ? { id, label: id, ok: true }
            : { id, label: id, ok: false, error: "indexer unavailable" },
        ),
      };
    },
  };
}

function memoryRefund() {
  const transfers: Array<{ payer: string; tinybars: string }> = [];
  return {
    transfers,
    async refund(request: { payer: string; tinybars: string }) {
      transfers.push(request);
      return { refundTx: `0.0.9@${transfers.length}.000000001` };
    },
  };
}

async function paySnapshot(url: string, query: string) {
  const path = `${url}/desk/snapshot?${query}`;
  const challenged = await fetch(path, {
    headers: { accept: "application/json" },
  });
  const offer = paymentOffers(
    decodeChallenge(challenged.headers.get("payment-required")!),
  )[0] as PaymentRequirements | undefined;
  const paid = await fetch(path, {
    headers: {
      accept: "application/json",
      "payment-signature": encodePaymentSignatureHeader({
        x402Version: 2,
        accepted: offer!,
        payload: { transaction: Buffer.from(query).toString("base64") },
      }),
    },
  });
  return { challenged, offer, paid };
}

describe("B13 unused-remainder refund", () => {
  it("is a blotter station a judge can read", async () => {
    const desk = await startDesk();
    try {
      const html = await (await fetch(`${desk.url}/app`)).text();
      expect(html).toMatch(/id="station-remainder"/);
      expect(html).toMatch(/remainder|refund/i);
    } finally {
      await desk.close();
    }
  });

  it("does not refund an unpaid challenge", async () => {
    const refund = memoryRefund();
    const ledger = createMemoryLedger();
    const desk = await startDesk({}, undefined, {
      ledger,
      merchandise: failSoftMerchandise(),
      refund,
    });
    try {
      const res = await fetch(`${desk.url}/desk/snapshot?${FAIL_SOFT_QUERY}`, {
        headers: { accept: "application/json" },
      });
      expect(res.status).toBe(402);
      expect(refund.transfers).toHaveLength(0);
      expect(ledger.bills).toHaveLength(0);
    } finally {
      await desk.close();
    }
  });

  it("refunds unused prepaid tinybars after a fail-soft snapshot", async () => {
    const refund = memoryRefund();
    const ledger = createMemoryLedger();
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk(
      { facilitatorUrl: facilitator.url },
      undefined,
      { ledger, merchandise: failSoftMerchandise(), refund },
    );
    try {
      const { offer, paid } = await paySnapshot(desk.url, FAIL_SOFT_QUERY);
      expect(offer?.amount).toBe("200000");
      expect(paid.status).toBe(200);
      const body = (await paid.json()) as {
        units?: number;
        protocols?: Array<{ ok?: boolean }>;
      };
      expect(body.units).toBe(2);
      expect(body.protocols?.filter((row) => row.ok)).toHaveLength(1);

      expect(refund.transfers).toEqual([
        { payer: "0.0.1", tinybars: "100000" },
      ]);
      expect(ledger.bills).toHaveLength(1);
      const bill = ledger.bills[0]!;
      expect(bill.units).toBe(1);
      expect(bill.tinybars).toBe("100000");
      expect(bill.prepaidTinybars).toBe("200000");
      expect(bill.refundTinybars).toBe("100000");
      expect(bill.refundTx).toBe("0.0.9@1.000000001");
      expect(bill.settleTx).toBe("0.0.1@1234567890.000000001");
      expect(BigInt(bill.units) * 100000n).toBe(BigInt(bill.tinybars));
      expect(BigInt(bill.prepaidTinybars!) - BigInt(bill.tinybars)).toBe(
        BigInt(bill.refundTinybars!),
      );
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });

  it("does not refund when every prepaid unit is burned", async () => {
    const refund = memoryRefund();
    const ledger = createMemoryLedger();
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk(
      { facilitatorUrl: facilitator.url },
      undefined,
      { ledger, refund },
    );
    try {
      const { paid } = await paySnapshot(
        desk.url,
        "protocols=aave-v3-ethereum,compound-v3-ethereum",
      );
      expect(paid.status).toBe(200);
      expect(refund.transfers).toHaveLength(0);
      expect(ledger.bills[0]).toMatchObject({
        units: 2,
        tinybars: "200000",
        prepaidTinybars: "200000",
        refundTinybars: "0",
      });
      expect(ledger.bills[0]?.refundTx).toBeUndefined();
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });

  it("lets a judge recompute owed and remainder from the ledger", async () => {
    const refund = memoryRefund();
    const ledger = createMemoryLedger("0.0.10464309");
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk(
      { facilitatorUrl: facilitator.url, hcsTopicId: "0.0.10464309" },
      undefined,
      { ledger, merchandise: failSoftMerchandise(), refund },
    );
    try {
      await paySnapshot(desk.url, FAIL_SOFT_QUERY);
      const listed = await fetch(`${desk.url}/desk/ledger`);
      const body = (await listed.json()) as {
        recompute?: string;
        bills?: Array<Record<string, unknown>>;
      };
      expect(body.recompute).toMatch(/prepaidTinybars - tinybars = refundTinybars/i);
      expect(body.bills?.[0]).toMatchObject({
        units: 1,
        tinybars: "100000",
        prepaidTinybars: "200000",
        refundTinybars: "100000",
        refundTx: "0.0.9@1.000000001",
      });
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });
});
